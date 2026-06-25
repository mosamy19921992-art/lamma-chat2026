import React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";

export interface IncomingCallInfo {
  name: string;
  avatar: string;
  callType: "audio" | "video";
}

interface LuxuryIncomingCallModalProps {
  isOpen: boolean;
  caller: IncomingCallInfo;
  onAccept: () => void;
  onReject: () => void;
}

export function LuxuryIncomingCallModal({
  isOpen,
  caller,
  onAccept,
  onReject,
}: LuxuryIncomingCallModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(20px)",
        zIndex: 3000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes avatarPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
        }
      `}</style>

      {/* Avatar */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 95, 70, 0.3))",
          border: "3px solid rgba(16, 185, 129, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          fontWeight: "700",
          color: "#10b981",
          marginBottom: "20px",
          animation: "avatarPulse 2s ease-in-out infinite",
        }}
      >
        {caller.avatar || "م"}
      </div>

      {/* Call Info */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "24px", fontWeight: "700", color: "#ecfdf5", marginBottom: "8px" }}>
          {caller.name}
        </div>
        <div style={{ fontSize: "14px", color: "rgba(148, 163, 184, 0.8)" }}>
          {caller.callType === "video" ? "مكالمة فيديو واردة" : "مكالمة صوتية واردة"}
        </div>
      </div>

      {/* Call Actions */}
      <div style={{ display: "flex", gap: "24px" }}>
        <button
          onClick={onAccept}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {caller.callType === "video" ? <Video size={24} /> : <Phone size={24} />}
        </button>
        <button
          onClick={onReject}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}
