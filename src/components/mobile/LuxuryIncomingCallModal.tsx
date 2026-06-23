import React from "react";
import { Phone, PhoneOff } from "lucide-react";

interface LuxuryIncomingCallModalProps {
  isOpen: boolean;
  caller: {
    name: string;
    avatar: string;
    callType: "audio" | "video";
  };
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
    <div className="lamma-incoming-call-modal">
      {/* Avatar */}
      <div className="lamma-call-avatar">{caller.avatar}</div>

      {/* Call Info */}
      <div className="lamma-call-info">
        <div className="lamma-call-name">{caller.name}</div>
        <div className="lamma-call-status">
          {caller.callType === "video" ? "مكالمة فيديو واردة" : "مكالمة صوتية واردة"}
        </div>
      </div>

      {/* Call Actions */}
      <div className="lamma-call-actions">
        <button
          className="lamma-call-action-btn lamma-call-reject lamma-ripple-button"
          onClick={onReject}
        >
          <PhoneOff size={28} />
        </button>
        <button
          className="lamma-call-action-btn lamma-call-accept lamma-ripple-button"
          onClick={onAccept}
        >
          <Phone size={28} />
        </button>
      </div>
    </div>
  );
}
