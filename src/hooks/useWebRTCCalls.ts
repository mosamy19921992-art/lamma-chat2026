import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSession } from "../lib/chatTypes";
import { CALL_RING_TIMEOUT_MS, ICE_FAILOVER_DELAY_MS } from "../services/calls/callConfig";
import {
  extractIceCandidates,
  fetchLatestOffer,
  flushAllIceQueues,
  sendCallSignal,
  subscribeToCallSignals,
  type CallSignalRow,
} from "../services/calls/callSignalingService";
import {
  WebRTCCallEngine,
  type CallMediaType,
} from "../services/calls/webrtcCallEngine";
import { describeMediaError, type CallFailureReason } from "../services/calls/callMediaUtils";
import {
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from "../services/calls/callRingtone";

export interface ActiveCallState {
  callId: string;
  target: string;
  targetUid: string;
  type: CallMediaType;
  status:
    | "connecting"
    | "ringing"
    | "connected"
    | "reconnecting"
    | "failed"
    | "ended";
  serverIndex: number;
  serverName: string;
  callDuration: number;
  isFallback: boolean;
  isIncoming: boolean;
  failureReason?: CallFailureReason;
}

export interface IncomingCallState {
  callId: string;
  fromNickname: string;
  fromUid: string;
  type: CallMediaType;
  offer?: RTCSessionDescriptionInit;
}

interface UseWebRTCCallsOptions {
  currentUser: UserSession;
  resolveUid: (nickname: string) => string | null | Promise<string | null>;
  canMakeCall: (type: CallMediaType) => boolean;
  /** Call signaling realtime only on the leader tab. */
  isTabLeader?: boolean;
}

export function useWebRTCCalls({
  currentUser,
  resolveUid,
  canMakeCall,
  isTabLeader = true,
}: UseWebRTCCallsOptions) {
  const myUid = currentUser.uid || "";
  const myNick = currentUser.nickname;

  const engineRef = useRef<WebRTCCallEngine | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());
  const callTypeRef = useRef<CallMediaType>("audio");
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endCallDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerUidRef = useRef<string>("");
  const peerNickRef = useRef<string>("");
  const callIdRef = useRef<string>("");
  const isCallerRef = useRef(false);
  const durationStartedRef = useRef(false);

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(
    null,
  );
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const incomingCallRef = useRef<IncomingCallState | null>(null);
  const pendingOffersRef = useRef<Record<string, RTCSessionDescriptionInit>>({});
  const pendingIceRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const pendingOfferTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endedCallIdsRef = useRef<Set<string>>(new Set());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    activeCallRef.current = activeCall;
    incomingCallRef.current = incomingCall;
    callTypeRef.current = activeCall?.type ?? incomingCall?.type ?? "audio";
  }, [activeCall, incomingCall]);

  const clearTimers = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (failoverTimeoutRef.current) clearTimeout(failoverTimeoutRef.current);
    if (endCallDelayRef.current) clearTimeout(endCallDelayRef.current);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    ringTimeoutRef.current = null;
    failoverTimeoutRef.current = null;
    endCallDelayRef.current = null;
    durationIntervalRef.current = null;
  }, []);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new WebRTCCallEngine();
    return engineRef.current;
  }, []);

  const flushPendingIce = useCallback(
    async (callId: string, engine: WebRTCCallEngine) => {
      const batch = pendingIceRef.current[callId];
      if (!batch?.length) return;
      delete pendingIceRef.current[callId];
      for (const candidate of batch) {
        await engine.addIceCandidate(candidate);
      }
    },
    [],
  );

  const bufferIncomingIce = useCallback(
    (callId: string, candidate: RTCIceCandidateInit) => {
      if (!pendingIceRef.current[callId]) {
        pendingIceRef.current[callId] = [];
      }
      pendingIceRef.current[callId].push(candidate);
    },
    [],
  );

  const patchCall = useCallback(
    (patch: Partial<ActiveCallState>) => {
      setActiveCall((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const startDurationTimer = useCallback(() => {
    if (durationStartedRef.current) return;
    durationStartedRef.current = true;
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setActiveCall((prev) =>
        prev ? { ...prev, callDuration: prev.callDuration + 1 } : prev,
      );
    }, 1000);
  }, []);

  const markConnected = useCallback(() => {
    patchCall({ status: "connected", failureReason: undefined });
    startDurationTimer();
  }, [patchCall, startDurationTimer]);

  const markFailed = useCallback(
    (reason: CallFailureReason = "network") => {
      patchCall({ status: "failed", failureReason: reason });
    },
    [patchCall],
  );

  const wireEngine = useCallback(
    (engine: WebRTCCallEngine, callId: string, peerUid: string) => {
      engine.onRemoteStream = (stream) => {
        setRemoteStream(stream);
        markConnected();
      };

      engine.onIceCandidate = (candidate) => {
        void sendCallSignal({
          call_id: callId,
          from_uid: myUid,
          from_nickname: myNick,
          to_uid: peerUid,
          to_nickname: peerNickRef.current,
          call_type: callTypeRef.current,
          signal_type: "ice",
          payload: { candidate },
        });
      };

      engine.onConnectionState = (state) => {
        if (state === "connected") {
          markConnected();
        } else if (state === "failed") {
          markFailed("network");
        } else if (state === "disconnected") {
          patchCall({ status: "reconnecting" });
        }
      };

      engine.onIceConnectionState = (state) => {
        if (state === "connected" || state === "completed") {
          markConnected();
        }
      };

      engine.onRecoverableError = (kind) => {
        if (kind !== "ice_restart") return;
        void (async () => {
          const offer = await engine.restartIce();
          if (!offer) return;
          await sendCallSignal({
            call_id: callId,
            from_uid: myUid,
            from_nickname: myNick,
            to_uid: peerUid,
            to_nickname: peerNickRef.current,
            call_type: callTypeRef.current,
            signal_type: "offer",
            payload: { sdp: offer, iceRestart: true },
          });
        })();
      };

      engine.onServerSwitch = (name, index) => {
        patchCall({ serverName: name, serverIndex: index, isFallback: index > 0 });
      };

      engine.onFailoverNeeded = () => {
        if (failoverTimeoutRef.current) return;
        failoverTimeoutRef.current = setTimeout(() => {
          failoverTimeoutRef.current = null;
          void (async () => {
            try {
              const eng = engineRef.current;
              if (!eng || eng.getServerIndex() >= 1) {
                markFailed("turn");
                return;
              }
              patchCall({ status: "reconnecting" });
              const switched = await eng.switchToFallbackServer();
              if (!switched) {
                markFailed("turn");
                return;
              }
              void sendCallSignal({
                call_id: callId,
                from_uid: myUid,
                from_nickname: myNick,
                to_uid: peerUid,
                to_nickname: peerNickRef.current,
                call_type: callTypeRef.current,
                signal_type: "server-switch",
                payload: { serverIndex: eng.getServerIndex() },
              });
              const offer = await eng.createOffer(true);
              if (offer) {
                await sendCallSignal({
                  call_id: callId,
                  from_uid: myUid,
                  from_nickname: myNick,
                  to_uid: peerUid,
                  to_nickname: peerNickRef.current,
                  call_type: callTypeRef.current,
                  signal_type: "offer",
                  payload: {
                    sdp: offer,
                    iceRestart: true,
                    serverIndex: eng.getServerIndex(),
                  },
                });
              }
            } catch (err) {
              console.warn("Call failover failed:", err);
              markFailed("turn");
            }
          })();
        }, ICE_FAILOVER_DELAY_MS);
      };
    },
    [markConnected, markFailed, myNick, myUid, patchCall, startDurationTimer],
  );

  const cleanupCall = useCallback(() => {
    clearTimers();
    stopIncomingCallRingtone();
    durationStartedRef.current = false;
    engineRef.current?.destroy();
    engineRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    callIdRef.current = "";
    peerUidRef.current = "";
    peerNickRef.current = "";
    isCallerRef.current = false;
  }, [clearTimers]);

  const endCall = useCallback(() => {
    const callId = callIdRef.current;
    const peerUid = peerUidRef.current;
    stopIncomingCallRingtone();
    if (callId) {
      endedCallIdsRef.current.add(callId);
    }
    void flushAllIceQueues();
    if (callId && peerUid && myUid) {
      void sendCallSignal({
        call_id: callId,
        from_uid: myUid,
        from_nickname: myNick,
        to_uid: peerUid,
        to_nickname: peerNickRef.current,
        call_type: activeCall?.type ?? "audio",
        signal_type: "hangup",
        payload: {},
      });
    }
    patchCall({ status: "ended" });
    cleanupCall();
    if (endCallDelayRef.current) clearTimeout(endCallDelayRef.current);
    endCallDelayRef.current = setTimeout(() => {
      endCallDelayRef.current = null;
      setActiveCall(null);
      setIncomingCall(null);
    }, 1200);
  }, [activeCall?.type, cleanupCall, myNick, myUid, patchCall]);

  const initiateCall = useCallback(
    async (targetNickname: string, type: CallMediaType) => {
      if (!canMakeCall(type)) {
        alert(
          type === "video"
            ? "⚠️ ميزة مكالمات الفيديو/الكاميرا غير مفعلة لحسابك. اطلب التفعيل من المالك."
            : "⚠️ ميزة المكالمات الصوتية غير مفعلة لحسابك. اطلب التفعيل من المالك.",
        );
        return;
      }
      if (!myUid || currentUser.authProvider !== "supabase") {
        alert("📞 المكالمات متاحة للحسابات المسجلة فقط.");
        return;
      }
      if (activeCall || incomingCall) return;

      const targetUid = await Promise.resolve(resolveUid(targetNickname));
      if (!targetUid) {
        alert(
          "⚠️ تعذر الاتصال — تأكد أن العضو مسجّل بحساب حقيقي. جرّب فتح محادثة خاصة معه أولاً.",
        );
        return;
      }

      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      peerUidRef.current = targetUid;
      peerNickRef.current = targetNickname;
      isCallerRef.current = true;

      setActiveCall({
        callId,
        target: targetNickname,
        targetUid,
        type,
        status: "connecting",
        serverIndex: 0,
        serverName: "Google STUN",
        callDuration: 0,
        isFallback: false,
        isIncoming: false,
      });

      try {
        const engine = getEngine();
        wireEngine(engine, callId, targetUid);

        const [stream, ringResult] = await Promise.all([
          engine.initMedia(type),
          sendCallSignal({
            call_id: callId,
            from_uid: myUid,
            from_nickname: myNick,
            to_uid: targetUid,
            to_nickname: targetNickname,
            call_type: type,
            signal_type: "ring",
            payload: {},
          }),
        ]);
        setLocalStream(stream);

        if (ringResult.error) {
          throw new Error(
            ringResult.error.includes("permission") ||
              ringResult.error.includes("policy")
              ? "صلاحية المكالمات غير مفعّلة لحسابك. اطلب التفعيل من المالك."
              : ringResult.error,
          );
        }

        engine.createPeerConnection();
        const offer = await engine.createOffer();
        const offerResult = await sendCallSignal({
          call_id: callId,
          from_uid: myUid,
          from_nickname: myNick,
          to_uid: targetUid,
          to_nickname: targetNickname,
          call_type: type,
          signal_type: "offer",
          payload: { sdp: offer },
        });
        if (offerResult.error) {
          throw new Error(offerResult.error);
        }

        patchCall({ status: "ringing" });

        ringTimeoutRef.current = setTimeout(() => {
          if (callIdRef.current === callId) {
            markFailed("timeout");
            endCall();
          }
        }, CALL_RING_TIMEOUT_MS);
      } catch (err) {
        console.error("Call start failed:", err);
        alert(describeMediaError(err, type));
        cleanupCall();
        setActiveCall(null);
      }
    },
    [
      activeCall,
      canMakeCall,
      cleanupCall,
      currentUser.authProvider,
      endCall,
      getEngine,
      incomingCall,
      markFailed,
      myNick,
      myUid,
      patchCall,
      resolveUid,
      wireEngine,
    ],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall || !myUid) return;
    stopIncomingCallRingtone();
    const { callId, fromUid, fromNickname, type, offer: storedOffer } = incomingCall;
    setIncomingCall(null);

    callIdRef.current = callId;
    peerUidRef.current = fromUid;
    peerNickRef.current = fromNickname;
    isCallerRef.current = false;

    setActiveCall({
      callId,
      target: fromNickname,
      targetUid: fromUid,
      type,
      status: "connecting",
      serverIndex: 0,
      serverName: "Google STUN",
      callDuration: 0,
      isFallback: false,
      isIncoming: true,
    });

    try {
      const engine = getEngine();
      wireEngine(engine, callId, fromUid);

      await sendCallSignal({
        call_id: callId,
        from_uid: myUid,
        from_nickname: myNick,
        to_uid: fromUid,
        to_nickname: fromNickname,
        call_type: type,
        signal_type: "accept",
        payload: {},
      });

      const stream = await engine.initMedia(type);
      setLocalStream(stream);
      engine.createPeerConnection();

      const offer =
        storedOffer ??
        pendingOffersRef.current[callId] ??
        (await fetchLatestOffer(callId));
      delete pendingOffersRef.current[callId];

      if (!offer) {
        throw new Error("Missing offer SDP");
      }

      await engine.setRemoteDescription(offer);
      await flushPendingIce(callId, engine);
      const answer = await engine.createAnswer();
      await sendCallSignal({
        call_id: callId,
        from_uid: myUid,
        from_nickname: myNick,
        to_uid: fromUid,
        to_nickname: fromNickname,
        call_type: type,
        signal_type: "answer",
        payload: { sdp: answer },
      });
    } catch (err) {
      console.error("Accept call failed:", err);
      alert(describeMediaError(err, type));
      void sendCallSignal({
        call_id: callId,
        from_uid: myUid,
        from_nickname: myNick,
        to_uid: fromUid,
        to_nickname: fromNickname,
        call_type: type,
        signal_type: "reject",
        payload: {},
      });
      cleanupCall();
      setActiveCall(null);
    }
  }, [
    cleanupCall,
    flushPendingIce,
    getEngine,
    incomingCall,
    myNick,
    myUid,
    wireEngine,
  ]);

  const rejectIncoming = useCallback(async () => {
    stopIncomingCallRingtone();
    if (!incomingCall || !myUid) return;
    endedCallIdsRef.current.add(incomingCall.callId);
    await sendCallSignal({
      call_id: incomingCall.callId,
      from_uid: myUid,
      from_nickname: myNick,
      to_uid: incomingCall.fromUid,
      to_nickname: incomingCall.fromNickname,
      call_type: incomingCall.type,
      signal_type: "reject",
      payload: {},
    });
    setIncomingCall(null);
    delete pendingOffersRef.current[incomingCall.callId];
    delete pendingIceRef.current[incomingCall.callId];
  }, [incomingCall, myNick, myUid]);

  // Handle incoming signals
  useEffect(() => {
    if (!myUid || currentUser.authProvider !== "supabase") return;
    if (!isTabLeader) return;

    processedSignals.current.clear();

    return subscribeToCallSignals(myUid, async (signal: CallSignalRow) => {
      if (processedSignals.current.has(signal.id)) return;
      processedSignals.current.add(signal.id);
      if (processedSignals.current.size > 500) {
        processedSignals.current = new Set(
          [...processedSignals.current].slice(-200),
        );
      }

      try {
      switch (signal.signal_type) {
        case "ring": {
          if (endedCallIdsRef.current.has(signal.call_id)) return;
          const ringAgeMs =
            Date.now() - new Date(signal.created_at).getTime();
          if (ringAgeMs > 30_000) return;

          if (
            activeCallRef.current &&
            activeCallRef.current.status !== "ended" &&
            activeCallRef.current.status !== "failed"
          ) {
            await sendCallSignal({
              call_id: signal.call_id,
              from_uid: myUid,
              from_nickname: myNick,
              to_uid: signal.from_uid,
              to_nickname: signal.from_nickname,
              call_type: signal.call_type,
              signal_type: "reject",
              payload: { reason: "busy" },
            });
            return;
          }
          if (
            incomingCallRef.current &&
            incomingCallRef.current.callId !== signal.call_id
          ) {
            await sendCallSignal({
              call_id: signal.call_id,
              from_uid: myUid,
              from_nickname: myNick,
              to_uid: signal.from_uid,
              to_nickname: signal.from_nickname,
              call_type: signal.call_type,
              signal_type: "reject",
              payload: { reason: "busy" },
            });
            return;
          }
          setIncomingCall((prev) => {
            if (prev?.callId === signal.call_id) return prev;
            return {
              callId: signal.call_id,
              fromNickname: signal.from_nickname,
              fromUid: signal.from_uid,
              type: signal.call_type,
              offer:
                prev?.offer ?? pendingOffersRef.current[signal.call_id],
            };
          });
          break;
        }

        case "offer": {
          const sdp = signal.payload.sdp as RTCSessionDescriptionInit;
          if (incomingCallRef.current?.callId === signal.call_id) {
            setIncomingCall((prev) =>
              prev ? { ...prev, offer: sdp } : prev,
            );
          } else if (
            !activeCallRef.current &&
            !incomingCallRef.current &&
            signal.to_uid === myUid
          ) {
            pendingOffersRef.current[signal.call_id] = sdp;
            setIncomingCall({
              callId: signal.call_id,
              fromNickname: signal.from_nickname,
              fromUid: signal.from_uid,
              type: signal.call_type,
              offer: sdp,
            });
            const offerTimer = setTimeout(() => {
              delete pendingOffersRef.current[signal.call_id];
              delete pendingIceRef.current[signal.call_id];
              pendingOfferTimersRef.current =
                pendingOfferTimersRef.current.filter((id) => id !== offerTimer);
            }, 60_000);
            pendingOfferTimersRef.current.push(offerTimer);
          } else if (callIdRef.current === signal.call_id) {
            const engine = getEngine();
            const iceRestart = Boolean(signal.payload.iceRestart);
            if (
              iceRestart ||
              typeof signal.payload.serverIndex === "number"
            ) {
              if (typeof signal.payload.serverIndex === "number") {
                engine.setServerIndex(signal.payload.serverIndex as number);
              }
              engine.createPeerConnection();
              wireEngine(engine, signal.call_id, signal.from_uid);
              const stream = engine.getLocalStream();
              if (stream) setLocalStream(stream);
            }
            await engine.setRemoteDescription(sdp);
            if (!isCallerRef.current) {
              const answer = await engine.createAnswer();
              await sendCallSignal({
                call_id: signal.call_id,
                from_uid: myUid,
                from_nickname: myNick,
                to_uid: signal.from_uid,
                to_nickname: signal.from_nickname,
                call_type: signal.call_type,
                signal_type: "answer",
                payload: { sdp: answer },
              });
            }
            patchCall({ status: "reconnecting" });
          }
          break;
        }

        case "answer": {
          if (callIdRef.current !== signal.call_id) break;
          const engine = getEngine();
          const sdp = signal.payload.sdp as RTCSessionDescriptionInit;
          await engine.setRemoteDescription(sdp);
          await flushPendingIce(signal.call_id, engine);
          if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          break;
        }

        case "ice": {
          const candidates = extractIceCandidates(signal.payload);
          if (candidates.length === 0) break;
          if (callIdRef.current === signal.call_id) {
            const engine = getEngine();
            for (const candidate of candidates) {
              try {
                await engine.addIceCandidate(candidate);
              } catch (err) {
                console.warn("ICE candidate skipped:", err);
              }
            }
          } else if (
            incomingCallRef.current?.callId === signal.call_id ||
            pendingOffersRef.current[signal.call_id]
          ) {
            for (const candidate of candidates) {
              bufferIncomingIce(signal.call_id, candidate);
            }
          }
          break;
        }

        case "server-switch": {
          if (callIdRef.current !== signal.call_id) break;
          const engine = getEngine();
          const idx = signal.payload.serverIndex as number;
          engine.setServerIndex(idx);
          engine.createPeerConnection();
          wireEngine(engine, signal.call_id, peerUidRef.current || signal.from_uid);
          const stream = engine.getLocalStream();
          if (stream) setLocalStream(stream);
          patchCall({
            serverIndex: idx,
            isFallback: idx > 0,
            serverName: engine.getServerName(),
            status: "reconnecting",
          });
          break;
        }

        case "accept":
          if (callIdRef.current === signal.call_id) {
            patchCall({ status: "connecting" });
          }
          break;

        case "reject":
        case "hangup": {
          endedCallIdsRef.current.add(signal.call_id);
          delete pendingOffersRef.current[signal.call_id];
          delete pendingIceRef.current[signal.call_id];
          stopIncomingCallRingtone();
          if (
            callIdRef.current === signal.call_id ||
            incomingCallRef.current?.callId === signal.call_id
          ) {
            patchCall({ status: "ended" });
            cleanupCall();
            setIncomingCall(null);
            if (endCallDelayRef.current) clearTimeout(endCallDelayRef.current);
            endCallDelayRef.current = setTimeout(() => {
              endCallDelayRef.current = null;
              setActiveCall(null);
            }, 1200);
          }
          break;
        }
      }
      } catch (err) {
        console.error("Call signal handling failed:", signal.signal_type, err);
        const critical =
          signal.signal_type === "offer" ||
          signal.signal_type === "answer" ||
          signal.signal_type === "accept";
        if (
          critical &&
          (callIdRef.current === signal.call_id ||
            incomingCallRef.current?.callId === signal.call_id)
        ) {
          markFailed("signal");
          cleanupCall();
          setIncomingCall(null);
          setActiveCall((prev) =>
            prev?.callId === signal.call_id
              ? { ...prev, status: "failed", failureReason: "signal" }
              : prev,
          );
        }
      }
    });
  }, [
    bufferIncomingIce,
    cleanupCall,
    currentUser.authProvider,
    flushPendingIce,
    getEngine,
    isTabLeader,
    markFailed,
    myNick,
    myUid,
    patchCall,
    wireEngine,
  ]);

  useEffect(() => {
    if (incomingCall && !activeCall) {
      void startIncomingCallRingtone();
    } else {
      stopIncomingCallRingtone();
    }
    return () => stopIncomingCallRingtone();
  }, [activeCall, incomingCall]);

  useEffect(() => {
    return () => {
      for (const timerId of pendingOfferTimersRef.current) {
        clearTimeout(timerId);
      }
      pendingOfferTimersRef.current = [];
      cleanupCall();
    };
  }, [cleanupCall]);

  const toggleMic = useCallback(() => {
  const engine = getEngine();
  const newState = engine.toggleMic();
  setIsMicMuted(!newState);
}, [getEngine]);

const toggleCamera = useCallback(() => {
  const engine = getEngine();
  const newState = engine.toggleCamera();
  setIsCameraOff(!newState);
}, [getEngine]);

const switchCamera = useCallback(async () => {
  const engine = getEngine();
  const success = await engine.switchCamera();
  return success;
}, [getEngine]);

return {
  activeCall,
  incomingCall,
  localStream,
  remoteStream,
  initiateCall,
  acceptIncoming,
  rejectIncoming,
  endCall,
  toggleMic,
  toggleCamera,
  switchCamera,
  isMicMuted,
  isCameraOff,
  webRTCServers: [
    { name: "Google STUN (Primary)" },
    { name: "Cloudflare STUN (Fallback)" },
  ],
};
}
