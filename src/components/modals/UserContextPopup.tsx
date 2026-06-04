// UserContextPopup — floating menu that appears when a user right-clicks or
// taps another member's avatar/nickname. Offers PM / view bio / add friend /
// ignore / block / admin tools actions.
//
// Extracted from ChatScreen.tsx — pure refactor. The handlers are passed in
// as a single object so the parent can keep its state in one place.

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { ChatMember } from "../../lib/chatTypes";

export interface UserContextHandlers {
  /** Send a private message to the target user. */
  onSendPM: (target: ChatMember) => void;
  /** Open the profile / bio popup for the target user. */
  onViewProfile: (target: ChatMember) => void;
  /** Add or remove the target from the friends list. */
  onToggleFriend: (target: ChatMember) => void;
  /** Add or remove the target from the ignore list. */
  onToggleIgnore: (target: ChatMember) => void;
  /** Add or remove the target from the blocked list. */
  onToggleBlock: (target: ChatMember) => void;
  /** Open the admin security panel (owner / admin / mod only). */
  onOpenAdminPanel: (target: ChatMember) => void;
  /** Close the popup. */
  onClose: () => void;
}

export interface UserContextPopupProps {
  isOpen: boolean;
  target: ChatMember | null;
  currentUser: { nickname: string; role: string };
  /** Nicknames already in the friends list. */
  friendsList: string[];
  /** Nicknames currently being ignored. */
  ignoredUsers: string[];
  /** Nicknames currently blocked. */
  blockedUsers: string[];
  handlers: UserContextHandlers;
}

export function UserContextPopup({
  isOpen,
  target,
  currentUser,
  friendsList,
  ignoredUsers,
  blockedUsers,
  handlers,
}: UserContextPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && target && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] bg-[#070b09]/98 border border-green-500/30 rounded-3xl overflow-hidden shadow-[0_10px_50px_rgba(16,185,129,0.25)] flex flex-col z-[100] cursor-move text-right"
          style={{
            resize: "both",
            overflow: "hidden",
            minWidth: "220px",
            minHeight: "250px",
            maxWidth: "90vw",
            maxHeight: "90vh",
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-green-500/10 bg-black/40 select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{target.avatar}</span>
              <h3 className="font-black text-white text-[11px] truncate max-w-[140px]">
                خيارات العضو {target.nickname}
              </h3>
            </div>
            <button
              onClick={handlers.onClose}
              className="p-1 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>

          {/* Options */}
          <div
            className="p-3 flex-1 flex flex-col gap-1.5 overflow-y-auto text-right"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <div className="text-center py-1.5 bg-black/30 rounded-lg border border-white/5 select-none compact-header shrink-0">
              <div className="text-[10px] font-black text-white">
                {target.nickname}
              </div>
              <div className="text-[8px] text-gray-500 font-bold mt-0.5">
                الحالة:{" "}
                {target.status === "online"
                  ? "🟢 متصل الآن"
                  : "⚫ غير متصل"}
              </div>
            </div>

            {target.nickname !== currentUser.nickname && (
              <button
                type="button"
                onClick={() => handlers.onSendPM(target)}
                className="w-full flex items-center gap-2 p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-right text-[10px] font-black transition-all border border-blue-500/25 cursor-pointer shadow-sm animate-pulse"
              >
                💬 محادثة خاصة (الخاص)
              </button>
            )}

            <button
              type="button"
              onClick={() => handlers.onViewProfile(target)}
              className="w-full flex items-center gap-2 p-2 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 rounded-xl text-right text-[10px] font-black transition-all border border-emerald-500/10 cursor-pointer"
            >
              👤 معلومات الشخص وبياناته الشخصية
            </button>

            <button
              type="button"
              onClick={() => handlers.onToggleFriend(target)}
              className="w-full flex items-center gap-2 p-2 bg-pink-500/5 hover:bg-pink-500/15 text-pink-400 rounded-xl text-right text-[10px] font-black transition-all border border-pink-500/10 cursor-pointer"
            >
              {friendsList.includes(target.nickname)
                ? "🌟 صديق بالفعل"
                : "💚 إضافه كصديق مقرب"}
            </button>

            <button
              type="button"
              onClick={() => handlers.onToggleIgnore(target)}
              className="w-full flex items-center gap-2 p-2 bg-yellow-500/5 hover:bg-yellow-500/15 text-yellow-400 rounded-xl text-right text-[10px] font-black transition-all border border-yellow-500/10 cursor-pointer"
            >
              {ignoredUsers.includes(target.nickname)
                ? "🔊 إلغاء تجاهل العضو"
                : "🔕 تجاهل رسائل هذا العضو"}
            </button>

            <button
              type="button"
              onClick={() => handlers.onToggleBlock(target)}
              className="w-full flex items-center gap-2 p-2 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-xl text-right text-[10px] font-black transition-all border border-red-500/10 cursor-pointer"
            >
              {blockedUsers.includes(target.nickname)
                ? "🔓 إلغاء الحظر والمنع"
                : "🚫 حظر العضو ومنعه نهائياً"}
            </button>

            {(currentUser.role === "owner" ||
              currentUser.role === "admin" ||
              currentUser.role === "mod") && (
              <button
                type="button"
                onClick={() => handlers.onOpenAdminPanel(target)}
                className="w-full flex items-center justify-center gap-1.5 p-2 bg-red-500/15 hover:bg-red-500/25 text-white rounded-xl text-center text-[10px] font-black transition-all border border-red-500/30 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)] mt-1 cursor-pointer animate-pulse"
              >
                🛡️ الرقابة والتحكم الأمني للأدمن
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UserContextPopup;
