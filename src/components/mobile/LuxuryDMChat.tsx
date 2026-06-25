import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, Send } from "lucide-react";

export interface DMContact {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

interface DMMessage {
  id: string;
  text: string;
  sent: boolean;
  time: string;
}

interface LuxuryDMChatProps {
  isOpen: boolean;
  onClose: () => void;
  contact: DMContact | null;
  currentUser: any;
  onCallAudio: (contactId: string) => void;
  onCallVideo: (contactId: string) => void;
}

export function LuxuryDMChat({
  isOpen,
  onClose,
  contact,
  currentUser,
  onCallAudio,
  onCallVideo,
}: LuxuryDMChatProps) {
  const [messages, setMessages] = useState<DMMessage[]>([
    { id: "1", text: "مرحباً! كيف حالك؟", sent: false, time: "10:30" },
    { id: "2", text: "أهلاً! الحمد لله بخير، وأنت؟", sent: true, time: "10:31" },
    { id: "3", text: "بخير الحمد لله، شكراً لسؤالك", sent: false, time: "10:32" },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;
  if (!contact) return null;

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: DMMessage = {
      id: Date.now().toString(),
      text: inputText,
      sent: true,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, newMessage]);
    setInputText("");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(6, 10, 14, 0.98)",
        backdropFilter: "blur(20px)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes messageSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px",
          paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
          background: "rgba(6, 10, 14, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
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
          <ArrowLeft size={20} />
        </button>

        {/* Avatar */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.2))",
            border: "2px solid rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
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
                width: "12px",
                height: "12px",
                background: "#10b981",
                border: "2px solid rgba(6, 10, 14, 1)",
                borderRadius: "50%",
              }}
            />
          )}
        </div>

        {/* Name */}
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ecfdf5", fontSize: "15px", fontWeight: "600" }}>
            {contact.name || "مستخدم"}
          </div>
          <div style={{ color: contact.online ? "#10b981" : "rgba(148, 163, 184, 0.6)", fontSize: "12px" }}>
            {contact.online ? "متصل الآن" : "غير متصل"}
          </div>
        </div>

        {/* Call Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onCallAudio(contact.id)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
              cursor: "pointer",
            }}
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => onCallVideo(contact.id)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a855f7",
              cursor: "pointer",
            }}
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              maxWidth: "80%",
              padding: "12px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              lineHeight: "1.4",
              alignSelf: message.sent ? "flex-end" : "flex-start",
              background: message.sent
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 95, 70, 0.3))"
                : "rgba(255, 255, 255, 0.08)",
              color: message.sent ? "#d1fae5" : "#e2e8f0",
              border: message.sent ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
              animation: "messageSlideIn 0.3s ease-out",
            }}
          >
            {message.text}
            <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "4px" }}>{message.time}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "16px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(6, 10, 14, 0.95)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="اكتب رسالة..."
          style={{
            flex: 1,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "24px",
            padding: "12px 20px",
            fontSize: "14px",
            color: "#ecfdf5",
            outline: "none",
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
