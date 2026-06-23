import React, { useState } from "react";
import { ArrowLeft, Phone, Video, X } from "lucide-react";
import { useMobileSwipeGestures } from "../../hooks/useMobileSwipeGestures";
import type { UserSession } from "../../lib/chatTypes";

interface DMContact {
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
  currentUser: UserSession;
}

export function LuxuryDMList({
  isOpen,
  onClose,
  onOpenChat,
  contacts,
  currentUser,
}: LuxuryDMListProps) {
  const { elementRef, deltaX } = useMobileSwipeGestures({
    onSwipeLeft: onClose,
    threshold: 80,
    disabled: !isOpen,
  });

  return (
    <>
      {/* Overlay */}
      <div
        className={`lamma-swipe-overlay ${isOpen ? "active" : ""}`}
        onClick={onClose}
      />

      {/* DM List Container */}
      <div
        ref={elementRef as React.RefObject<HTMLDivElement>}
        className={`lamma-dm-list lamma-mobile-sidebar-shell ${
          isOpen ? "swipe-right" : "swipe-left"
        }`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1001,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Header */}
        <div className="lamma-dm-header">
          <button className="lamma-dm-back-btn" onClick={onClose}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-emerald-50">المحادثات</h2>
          <div style={{ width: 36 }} />
        </div>

        {/* DM Items */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="lamma-dm-item lamma-ripple-button"
              onClick={() => onOpenChat(contact)}
            >
              {/* Avatar */}
              <div className="lamma-dm-avatar">
                {contact.avatar}
                {contact.online && <div className="lamma-dm-online-indicator" />}
              </div>

              {/* Info */}
              <div className="lamma-dm-info">
                <div className="lamma-dm-name">{contact.name}</div>
                <div className="lamma-dm-last-message">{contact.lastMessage}</div>
              </div>

              {/* Time */}
              <div className="lamma-dm-time">{contact.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
