import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, Send, Smile, Image as ImageIcon } from "lucide-react";
import { useMobileSwipeGestures } from "../../hooks/useMobileSwipeGestures";
import type { UserSession } from "../../lib/chatTypes";

interface DMMessage {
  id: string;
  text: string;
  sent: boolean;
  time: string;
}

interface LuxuryDMChatProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
  };
  currentUser: UserSession;
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
  if (!isOpen) return null;
  if (!contact) return null;

  const [messages, setMessages] = useState<DMMessage[]>([
    { id: "1", text: "مرحباً! كيف حالك؟", sent: false, time: "10:30" },
    { id: "2", text: "أهلاً! الحمد لله بخير، وأنت؟", sent: true, time: "10:31" },
    { id: "3", text: "بخير الحمد لله، شكراً لسؤالك", sent: false, time: "10:32" },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { elementRef } = useMobileSwipeGestures({
    onSwipeRight: onClose,
    threshold: 80,
    disabled: !isOpen,
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: DMMessage = {
      id: Date.now().toString(),
      text: inputText,
      sent: true,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newMessage]);
    setInputText("");
  };

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`lamma-dm-chat-container ${isOpen ? "active" : ""}`}
    >
      {/* Header */}
      <div className="lamma-dm-header">
        <button className="lamma-dm-back-btn lamma-ripple-button" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
 || "م"
        {/* Avatar */}
        <div className="lamma-dm-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
          {contact.avatar}
          {contact.online && <div className="lamma-dm-online-indicator" />}
        </div>
 || "مستخدم"
        {/* Name */}
        <div className="lamma-dm-info" style={{ flex: 1 }}>
          <div className="lamma-dm-name">{contact.name}</div>
          <div className="lamma-dm-last-message" style={{ color: contact.online ? "#10b981" : "rgba(148, 163, 184, 0.6)" }}>
            {contact.online ? "متصل الآن" : "غير متصل"}
          </div>
        </div>

        {/* Call Buttons */}
        <div className="lamma-dm-header-actions">
          <button
            className="lamma-dm-call-btn lamma-ripple-button"
            onClick={() => onCallAudio(contact.id)}
          >
            <Phone size={18} />
          </button>
          <button
            className="lamma-dm-call-btn video lamma-ripple-button"
            onClick={() => onCallVideo(contact.id)}
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="lamma-dm-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`lamma-dm-message ${message.sent ? "sent" : "received"}`}
          >
            {message.text}
            <div
              style={{
                fontSize: "10px",
                opacity: 0.6,
                marginTop: "4px",
                textAlign: message.sent ? "right" : "left",
              }}
            >
              {message.time}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="lamma-dm-input-area">
        <button className="lamma-dm-call-btn lamma-ripple-button" style={{ width: 36, height: 36 }}>
          <Smile size={16} />
        </button>
        <button className="lamma-dm-call-btn lamma-ripple-button" style={{ width: 36, height: 36 }}>
          <ImageIcon size={16} />
        </button>
        <input
          type="text"
          className="lamma-dm-input"
          placeholder="اكتب رسالة..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          className="lamma-dm-send-btn lamma-ripple-button"
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{ opacity: inputText.trim() ? 1 : 0.5 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
