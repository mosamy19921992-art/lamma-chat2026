import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSession } from "../lib/chatTypes";
import { CALL_RING_TIMEOUT_MS, ICE_FAILOVER_DELAY_MS } from "../services/calls/callConfig";
import {
  fetchLatestOffer,
  sendCallSignal,
  subscribeToCallSignals,
  type CallSignalRow,
} from "../services/calls/callSignalingService";
import {
  WebRTCCallEngine,
  type CallMediaType,
} from "../services/calls/webrtcCallEngine";
import { describeMediaError } from "../services/calls/callMediaUtils";

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
}

export function useWebRTCCalls({
  currentUser,
  resolveUid,
  canMakeCall,
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

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(
    null,
  );
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const incomingCallRef = useRef<IncomingCallState | null>(null);
  const pendingOffersRef = useRef<Record<string, RTCSessionDescriptionInit>>({});
  const pendingOfferTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

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

  const patchCall = useCallback(
    (patch: Partial<ActiveCallState>) => {
      setActiveCall((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setActiveCall((prev) =>
        prev ? { ...prev, callDuration: prev.callDuration + 1 } : prev,
      );
    }, 1000);
  }, []);

  const wireEngine = useCallback(
    (engine: WebRTCCallEngine, callId: string, peerUid: string) => {
      engine.onRemoteStream = (stream) => setRemoteStream(stream);

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
          patchCall({ status: "connected" });
          startDurationTimer();
        } else if (state === "failed") {
          patchCall({ status: "failed" });
        } else if (state === "disconnected") {
          patchCall({ status: "reconnecting" });
        }
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
                patchCall({ status: "failed" });
                return;
              }
              patchCall({ status: "reconnecting" });
              const switched = await eng.switchToFallbackServer();
              if (!switched) {
                patchCall({ status: "failed" });
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
              patchCall({ status: "failed" });
            }
          })();
        }, ICE_FAILOVER_DELAY_MS);
      };
    },
    [myNick, myUid, patchCall, startDurationTimer],
  );

  const cleanupCall = useCallback(() => {
    clearTimers();
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
        const stream = await engine.initMedia(type);
        setLocalStream(stream);
        engine.createPeerConnection();
        wireEngine(engine, callId, targetUid);

        const offer = await engine.createOffer();
        const ringResult = await sendCallSignal({
          call_id: callId,
          from_uid: myUid,
          from_nickname: myNick,
          to_uid: targetUid,
          to_nickname: targetNickname,
          call_type: type,
          signal_type: "ring",
          payload: {},
        });
        if (ringResult.error) {
          throw new Error(
            ringResult.error.includes("permission") ||
              ringResult.error.includes("policy")
              ? "صلاحية المكالمات غير مفعّلة لحسابك. اطلب التفعيل من المالك."
              : ringResult.error,
          );
        }
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
          if (callIdRef.current === callId) endCall();
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
      myNick,
      myUid,
      patchCall,
      resolveUid,
      wireEngine,
    ],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall || !myUid) return;
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
      const stream = await engine.initMedia(type);
      setLocalStream(stream);
      engine.createPeerConnection();
      wireEngine(engine, callId, fromUid);

      const offer =
        storedOffer ??
        pendingOffersRef.current[callId] ??
        (await fetchLatestOffer(callId));
      delete pendingOffersRef.current[callId];

      if (!offer) {
        throw new Error("Missing offer SDP");
      }

      await engine.setRemoteDescription(offer);
      const answer = await engine.createAnswer();
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
    getEngine,
    incomingCall,
    myNick,
    myUid,
    patchCall,
    startDurationTimer,
    wireEngine,
  ]);

  const rejectIncoming = useCallback(async () => {
    if (!incomingCall || !myUid) return;
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
  }, [incomingCall, myNick, myUid]);

  // Handle incoming signals
  useEffect(() => {
    if (!myUid || currentUser.authProvider !== "supabase") return;

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
          if (activeCallRef.current || incomingCallRef.current) {
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
          setIncomingCall({
            callId: signal.call_id,
            fromNickname: signal.from_nickname,
            fromUid: signal.from_uid,
            type: signal.call_type,
            offer: pendingOffersRef.current[signal.call_id],
          });
          break;
        }

        case "offer": {
          const engine = getEngine();
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
            const offerTimer = setTimeout(() => {
              delete pendingOffersRef.current[signal.call_id];
              pendingOfferTimersRef.current =
                pendingOfferTimersRef.current.filter((id) => id !== offerTimer);
            }, 60_000);
            pendingOfferTimersRef.current.push(offerTimer);
          } else if (callIdRef.current === signal.call_id) {
            const engine = getEngine();
            const sdp = signal.payload.sdp as RTCSessionDescriptionInit;
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
          if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          break;
        }

        case "ice": {
          if (callIdRef.current !== signal.call_id) break;
          const engine = getEngine();
          await engine.addIceCandidate(
            signal.payload.candidate as RTCIceCandidateInit,
          );
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
          delete pendingOffersRef.current[signal.call_id];
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
        if (
          callIdRef.current === signal.call_id ||
          incomingCallRef.current?.callId === signal.call_id
        ) {
          patchCall({ status: "failed" });
          cleanupCall();
          setIncomingCall(null);
          setActiveCall(null);
        }
      }
    });
  }, [
    cleanupCall,
    currentUser.authProvider,
    getEngine,
    myNick,
    myUid,
    patchCall,
    startDurationTimer,
    wireEngine,
  ]);

  useEffect(() => {
    return () => {
      for (const timerId of pendingOfferTimersRef.current) {
        clearTimeout(timerId);
      }
      pendingOfferTimersRef.current = [];
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    initiateCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
    webRTCServers: [
      { name: "Google STUN (Primary)" },
      { name: "Cloudflare STUN (Fallback)" },
    ],
  };
}
