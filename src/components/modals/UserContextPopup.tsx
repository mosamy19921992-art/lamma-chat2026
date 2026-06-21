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
import { MemberAvatar } from "../MemberAvatar";

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
  /** Mobile layout — bottom sheet instead of draggable floater. */
  isMobile?: boolean;
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
  isMobile = false,
  friendsList,
  ignoredUsers,
  blockedUsers,
  handlers,
}: UserContextPopupProps) {
  const sheetBody = target ? (
    <>
      <div className="flex items-center justify-between p-3 select-none lamma-modal-header shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-6 h-6 flex items-center justify-center overflow-hidden rounded-full shrink-0">
            <MemberAvatar
              avatar={target.avatar}
              size="xs"
              className="w-full h-full"
              imageClassName="w-full h-full rounded-full"
            />
          </span>
          <h3 className="font-black text-white text-[11px] truncate max-w-[140px]">
            {isMobile ? target.nickname : `خيارات العضو ${target.nickname}`}
          </h3>
        </div>
        <button
          type="button"
          onClick={handlers.onClose}
          className="p-1 rounded-lg transition-all cursor-pointer lamma-danger-btn"
        >
          <X size={12} />
        </button>
      </div>

      <div
        className="p-3 flex-1 flex flex-col gap-1.5 overflow-y-auto text-right min-h-0"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        <div className="text-center py-1.5 rounded-lg select-none compact-header shrink-0 lamma-section-card">
          <div className="text-[10px] font-black text-white">{target.nickname}</div>
          <div className="text-[8px] text-gray-500 font-bold mt-0.5">
            الحالة:{" "}
            {target.status === "online" ? "🟢 متصل الآن" : "⚫ غير متصل"}
          </div>
        </div>

        {target.nickname !== currentUser.nickname && (
          <button
            type="button"
            onClick={() => handlers.onSendPM(target)}
            className="w-full flex items-center gap-2 p-3 rounded-xl text-right text-[11px] font-black transition-all cursor-pointer shadow-sm lamma-accent-btn min-h-[44px]"
          >
            💬 محادثة خاصة
          </button>
        )}

        <button
          type="button"
          onClick={() => handlers.onViewProfile(target)}
          className="w-full flex items-center gap-2 p-3 rounded-xl text-right text-[11px] font-black transition-all cursor-pointer lamma-list-item min-h-[44px]"
        >
          👤 الملف الشخصي
        </button>

        <button
          type="button"
          onClick={() => handlers.onToggleFriend(target)}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl text-right text-[10px] font-black transition-all cursor-pointer lamma-list-item min-h-[40px]"
        >
          {friendsList.includes(target.nickname)
            ? "💔 إزالة من الأصدقاء"
            : "💚 إضافه كصديق مقرب"}
        </button>

        <button
          type="button"
          onClick={() => handlers.onToggleIgnore(target)}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl text-right text-[10px] font-black transition-all cursor-pointer lamma-list-item min-h-[40px]"
        >
          {ignoredUsers.includes(target.nickname)
            ? "🔊 إلغاء تجاهل العضو"
            : "🔕 تجاهل رسائل هذا العضو"}
        </button>

        <button
          type="button"
          onClick={() => handlers.onToggleBlock(target)}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl text-right text-[10px] font-black transition-all cursor-pointer lamma-list-item min-h-[40px]"
        >
          {blockedUsers.includes(target.nickname)
            ? "🔓 إلغاء الحظر والمنع"
            : "🚫 إخفاء العضو وحظر رسائله لديك"}
        </button>

        {(currentUser.role === "owner" ||
          currentUser.role === "admin" ||
          currentUser.role === "mod") && (
          <button
            type="button"
            onClick={() => handlers.onOpenAdminPanel(target)}
            className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-center text-[10px] font-black transition-all mt-1 cursor-pointer lamma-danger-btn min-h-[40px]"
          >
            🛡️ الرقابة والتحكم الأمني
          </button>
        )}
      </div>
    </>
  ) : null;

  return (
    <AnimatePresence>
      {isOpen && target && isMobile ? (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9994] bg-black/65 lamma-user-overlay"
            onClick={handlers.onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[9995] max-h-[88vh] rounded-t-[28px] overflow-hidden flex flex-col text-right lamma-modal-shell lamma-user-overlay border-t border-white/10"
            dir="rtl"
          >
            {sheetBody}
          </motion.div>
        </>
      ) : null}
      {isOpen && target && !isMobile ? (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] rounded-3xl overflow-hidden flex flex-col z-[9995] cursor-move text-right lamma-modal-shell lamma-user-overlay"
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
          {sheetBody}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default UserContextPopup;
