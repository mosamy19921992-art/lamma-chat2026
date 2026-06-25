import React from "react";
import { MessageCircle, X, Phone, Video } from "lucide-react";

export interface DMContact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  online: boolean;
}

interface LuxuryDMListProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (contact: DMContact) => void;
  contacts: DMContact[];
  currentUser: any;
}

export function LuxuryDMList({
  isOpen,
  onClose,
  onOpenChat,
  contacts,
  currentUser,
}: LuxuryDMListProps) {
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
        backdropFilter: "blur(10px)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
          background: "rgba(6, 10, 14, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <h3 style={{ color: "#ecfdf5", fontSize: "18px", fontWeight: "700" }}>
          الرسائل الخاصة
        </h3>
        <button
          onClick={onClose}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
            border: "none",
            color: "#ecfdf5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* DM List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {contacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => onOpenChat(contact)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "12px",
              marginBottom: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.2))",
                border: "2px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "700",
                color: "#10b981",
                position: "relative",
              }}
            >
              {contact.avatar || "م"}
              {contact.online && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    width: "14px",
                    height: "14px",
                    background: "#10b981",
                    border: "2px solid rgba(6, 10, 14, 1)",
                    borderRadius: "50%",
                  }}
                />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#ecfdf5", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>
                {contact.name || "مستخدم"}
              </div>
              <div style={{ color: "rgba(148, 163, 184, 0.8)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {contact.lastMessage || ""}
              </div>
            </div>

            {/* Time */}
            <div style={{ color: "rgba(148, 163, 184, 0.5)", fontSize: "11px" }}>
              {contact.time || ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
