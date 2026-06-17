// UserProfileBioPopup — shows a member's profile card, role, bio, and
// quick actions (PM, back to context menu, etc.).
//
// Extracted from ChatScreen.tsx — pure refactor, no behavior change.

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { ChatMember } from "../../lib/chatTypes";
import { MemberAvatar } from "../MemberAvatar";
import { OwnerIdCard } from "../OwnerIdCard";
import { isOwnerChatRole } from "../../lib/ownerIdentity";

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  platinum_vip: {
    label: "PLATINUM VIP",
    className: "lamma-role-chip lamma-role-plat",
  },
  owner: {
    label: "OWNER",
    className: "lamma-role-chip lamma-role-owner",
  },
  admin: {
    label: "ADMIN",
    className: "lamma-role-chip lamma-role-admin",
  },
  mod: {
    label: "MODERATOR",
    className: "lamma-role-chip lamma-role-mod",
  },
  vip: {
    label: "VIP",
    className: "lamma-role-chip lamma-role-vip",
  },
  user: {
    label: "MEMBER",
    className: "lamma-role-chip",
  },
  guest: {
    label: "GUEST",
    className: "lamma-role-chip",
  },
};

const DEFAULT_BADGE = {
  label: "MEMBER",
  className: "lamma-role-chip",
};

function getRoleBadge(role: string) {
  return ROLE_BADGE[role] ?? DEFAULT_BADGE;
}

// البيو يُقرأ من الـ member.bio الحقيقي القادم من Supabase
// لو مفيش بيو محفوظ يُعرض نص افتراضي عام بدون افتراضات على الاسم
function getDisplayBio(member: ChatMember, savedBio?: string): string {
  if (savedBio && savedBio.trim()) return savedBio.trim();
  if ((member as any).bio && (member as any).bio.trim()) return (member as any).bio.trim();
  const isGuest =
    member.role === "guest" ||
    member.nickname.toLowerCase().includes("guest") ||
    member.nickname.includes("زائر");
  return isGuest
    ? "زائر في شات لمة."
    : "لم يُضف هذا العضو نبذة تعريفية بعد.";
}

export interface UserProfileBioHandlers {
  /** Open private message to the target user. */
  onSendPM: (target: ChatMember) => void;
  /** Switch to the context menu for the same target. */
  onBackToContext: (target: ChatMember) => void;
  /** Close the popup. */
  onClose: () => void;
  /** Persist the user's own bio locally. */
  onBioChange: (newBio: string) => void;
}

export interface UserProfileBioPopupProps {
  isOpen: boolean;
  target: ChatMember | null;
  currentUserNickname: string;
  /** Current bio text (only relevant when the target is the current user). */
  myCustomBio: string;
  friendsList: string[];
  handlers: UserProfileBioHandlers;
}

export function UserProfileBioPopup({
  isOpen,
  target,
  currentUserNickname,
  myCustomBio,
  friendsList,
  handlers,
}: UserProfileBioPopupProps) {
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
          className="fixed top-24 left-4 md:left-auto md:right-1/4 w-[300px] rounded-3xl overflow-hidden flex flex-col z-[101] cursor-move text-right lamma-modal-shell"
          style={{
            resize: "both",
            overflow: "hidden",
            minWidth: "260px",
            minHeight: "365px",
            maxWidth: "90vw",
            maxHeight: "90vh",
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 select-none lamma-modal-header">
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <h3 className="font-sans font-black text-white text-xs">
                الملف الشخصي والبيانات
              </h3>
            </div>
            <button
              onClick={handlers.onClose}
              className="p-1.5 rounded-xl transition-all cursor-pointer lamma-danger-btn"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto text-right"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            {/* Visual card */}
            {isOwnerChatRole(target.role) ? (
              <OwnerIdCard
                nickname={target.nickname}
                tagline="مالك المنصة • LAMMA CHAT"
              />
            ) : (
            <div className="p-3 rounded-2xl flex flex-col items-center text-center gap-2 select-none shrink-0 lamma-section-card">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden lamma-quiet-power-btn">
                <MemberAvatar
                  avatar={target.avatar}
                  size="lg"
                  className="w-full h-full"
                  imageClassName="w-full h-full rounded-2xl"
                />
              </div>
              <div>
                <div className="text-xs font-black text-white">
                  {target.nickname}
                </div>
                <div
                  className={`text-[8.5px] px-2 py-0.5 mt-1 rounded tracking-wider inline-block font-black uppercase ${getRoleBadge(target.role).className}`}
                >
                  {getRoleBadge(target.role).label}
                </div>
              </div>
            </div>
            )}

            {/* Bio area */}
            <div className="space-y-1">
              <label
                htmlFor="my-custom-bio-input"
                className="text-[9px] font-black text-[#a3e635] uppercase select-none"
              >
                السيرة الذاتية والبيانات الشخصية (Bio):
              </label>

              {target.nickname === currentUserNickname ? (
                <div className="space-y-2">
                  <textarea
                    id="my-custom-bio-input"
                    name="myCustomBio"
                    autoComplete="off"
                    value={myCustomBio}
                    onChange={(e) => handlers.onBioChange(e.target.value)}
                    placeholder="اكتب شيئاً تعريفيًا مميزًا عنك ليراه الآخرون هنا..."
                    className="w-full h-20 p-2 rounded-xl text-[10px] text-white focus:outline-none resize-none text-right placeholder-gray-600 font-bold lamma-input-shell"
                  />
                  <div className="text-[8px] text-gray-500 font-bold select-none">
                    * هذه سيرتك الذاتية المحلية على جهازك الحالي، ويمكنك
                    تعديلها هنا مباشرةً. مزامنتها لكل الأعضاء ستتوفر لاحقاً 💾
                    .
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl text-[10px] text-gray-300 leading-relaxed break-words font-semibold text-right lamma-section-card">
                  {getDisplayBio(target)}
                </div>
              )}
            </div>

            {/* Extra Simulated Metadata of Profile details */}
            <div className="space-y-1 mt-1">
              <div className="text-[9px] font-black text-gray-400 uppercase select-none">
                تفاصيل العضوية المعتمدة:
              </div>
              <div className="p-2 rounded-xl space-y-1.5 text-[9px] font-mono text-gray-400 select-none lamma-section-card">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">حالة الصداقة:</span>{" "}
                  <span
                    className={
                      friendsList.includes(target.nickname)
                        ? "text-pink-400 font-bold"
                        : "text-gray-500 font-bold"
                    }
                  >
                    {friendsList.includes(target.nickname)
                      ? "💚 صديق مفضل"
                      : "👤 لا يوجد علاقة"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">الرقم الفريد:</span>{" "}
                  <span className="text-gray-500">
                    {target.id || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Private Message direct trigger if not self */}
            {target.nickname !== currentUserNickname && (
              <button
                type="button"
                onClick={() => handlers.onSendPM(target)}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-center text-[10px] font-black transition-all cursor-pointer select-none shrink-0 lamma-accent-btn"
              >
                💬 فتح محادثة خاصة (الخاص)
              </button>
            )}

            {/* Quick actions inside bio pop details */}
            <div className="flex gap-2 select-none mt-1 shrink-0">
              <button
                type="button"
                onClick={() => handlers.onBackToContext(target)}
                className="flex-1 py-1.5 px-2 rounded-lg text-[9px] font-bold text-center transition-all cursor-pointer lamma-muted-btn"
              >
                🔙 رجوع لخيارات العضو
              </button>
              <button
                type="button"
                onClick={handlers.onClose}
                className="py-1.5 px-2 rounded-lg text-[9px] font-bold text-center transition-all cursor-pointer lamma-danger-btn"
              >
                ❌ إغلاق النافذة
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UserProfileBioPopup;
