import { getIceServerBundles, ICE_CANDIDATE_POOL_SIZE } from "./callConfig";
import {
  requestCallMedia,
  type CallMediaType,
} from "./callMediaUtils";

export type { CallMediaType } from "./callMediaUtils";

export class WebRTCCallEngine {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private serverIndex = 0;
  private readonly bundles = getIceServerBundles();
  private failoverInProgress = false;
  private pendingRemoteCandidates: RTCIceCandidateInit[] = [];
  private iceRestartAttempts = 0;

  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onIceConnectionState?: (state: RTCIceConnectionState) => void;
  onServerSwitch?: (name: string, index: number) => void;
  onFailoverNeeded?: () => void;
  onRecoverableError?: (message: string) => void;

  getLocalStream() {
    return this.localStream;
  }

  getServerIndex() {
    return this.serverIndex;
  }

  getServerName() {
    return this.bundles[this.serverIndex]?.name ?? "Unknown";
  }

  setServerIndex(index: number) {
    if (index >= 0 && index < this.bundles.length) {
      this.serverIndex = index;
    }
  }

  async initMedia(type: CallMediaType): Promise<MediaStream> {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
    }
    this.localStream = await requestCallMedia(type);
    return this.localStream;
  }

  createPeerConnection() {
    this.closePeerConnection(false);
    this.pendingRemoteCandidates = [];
    this.iceRestartAttempts = 0;
    const bundle = this.bundles[this.serverIndex] ?? this.bundles[0];
    if (!bundle) {
      throw new Error("No ICE server bundle configured");
    }
    this.pc = new RTCPeerConnection({
      iceServers: bundle.iceServers,
      iceCandidatePoolSize: ICE_CANDIDATE_POOL_SIZE,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    this.pc.ontrack = (ev) => {
      if (ev.streams[0]) this.onRemoteStream?.(ev.streams[0]);
    };

    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) this.onIceCandidate?.(ev.candidate.toJSON());
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state) this.onConnectionState?.(state);
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      if (!state) return;
      this.onIceConnectionState?.(state);
      if (state === "failed" && !this.failoverInProgress) {
        if (this.iceRestartAttempts < 1) {
          this.iceRestartAttempts += 1;
          void this.restartIce().then((offer) => {
            if (offer) {
              this.onRecoverableError?.("ice_restart");
            } else {
              this.onFailoverNeeded?.();
            }
          });
          return;
        }
        this.onFailoverNeeded?.();
      }
    };
  }

  private async flushPendingRemoteCandidates(): Promise<void> {
    if (!this.pc?.remoteDescription) return;
    const batch = this.pendingRemoteCandidates.splice(0);
    for (const candidate of batch) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // stale candidate after renegotiation — safe to ignore
      }
    }
  }

  async createOffer(iceRestart = false): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("PeerConnection not ready");
    const offer = await this.pc.createOffer({ iceRestart });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("PeerConnection not ready");
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error("PeerConnection not ready");
    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
    await this.flushPendingRemoteCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc || !candidate?.candidate) return;
    if (!this.pc.remoteDescription) {
      this.pendingRemoteCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // stale candidate after renegotiation — safe to ignore
    }
  }

  /** Switch to fallback server bundle and recreate peer connection. */
  async switchToFallbackServer(): Promise<boolean> {
    if (this.serverIndex >= this.bundles.length - 1) return false;
    this.failoverInProgress = true;
    this.serverIndex++;
    this.pendingRemoteCandidates = [];
    this.iceRestartAttempts = 0;
    this.onServerSwitch?.(
      this.bundles[this.serverIndex]?.name ?? "fallback",
      this.serverIndex,
    );
    this.createPeerConnection();
    this.failoverInProgress = false;
    return true;
  }

  async restartIce(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) return null;
    try {
      return await this.createOffer(true);
    } catch {
      return null;
    }
  }

  closePeerConnection(stopMedia = true) {
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    if (stopMedia && this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  destroy() {
    this.closePeerConnection(true);
    this.serverIndex = 0;
  }
}
