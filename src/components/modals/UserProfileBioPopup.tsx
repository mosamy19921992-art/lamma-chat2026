// UserProfileBioPopup — shows a member's profile card, role, bio, and
// quick actions (PM, back to context menu, etc.).
//
// Extracted from ChatScreen.tsx — pure refactor, no behavior change.

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { ChatMember } from "../../lib/chatTypes";

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  platinum_vip: {
    label: "PLATINUM VIP",
    className:
      "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  },
  owner: {
    label: "OWNER",
    className: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
  },
  admin: {
    label: "ADMIN",
    className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  mod: {
    label: "MODERATOR",
    className: "bg-purple-500/15 text-purple-500 border border-purple-500/20",
  },
  vip: {
    label: "VIP",
    className: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  user: {
    label: "MEMBER",
    className: "bg-gray-500/15 text-gray-400 border border-gray-500/20",
  },
  guest: {
    label: "GUEST",
    className: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
  },
};

const DEFAULT_BADGE = {
  label: "MEMBER",
  className: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
};

function getRoleBadge(role: string) {
  return ROLE_BADGE[role] ?? DEFAULT_BADGE;
}

function getSimulatedBio(nickname: string): string {
  const lower = nickname.toLowerCase();
  if (lower.includes("سارة") || lower.includes("sara")) {
    return "عضوة نشطة من الجيل الذهبي، أعشق الدردشة الرائعة وتصميم غرف الاستقبال 🌸. متواجدة دائماً للمساعدة!";
  }
  if (lower.includes("محمد") || lower.includes("mohamed")) {
    return "مطور ويب من عشاق الهدوء والموسيقى، أبحث عن تبادل الكلمات الطيبة والأصدقاء الأوفياء 🎧.";
  }
  if (lower.includes("أحمد") || lower.includes("ahmed")) {
    return "المالك التأسيسي لموقع شات لمة الرائد 👑. نرحب بجميع الضيوف الكرام ونتمنى لهم أسعد الأوقات الهادفة.";
  }
  if (lower.includes("علي") || lower.includes("ali")) {
    return "مشرف أمني أول 🛡️. يرجى الحفاظ على الآداب العامة والتقيد بالقوانين لراحة الجميع.";
  }
  if (lower.includes("نور") || lower.includes("nour")) {
    return "عاشق السفر وتبادل الثقافات العربية بوقار 🗺️. مرحباً بكل من يسأل أو يريد الصداقة!";
  }
  if (lower.includes("guest") || lower.includes("زائر")) {
    return "زائر مميز يستمتع بالحديث وغرف الدردشة الفورية الآمنة في شات لمة المتكامل 💫.";
  }
  return "عضو مميز مسجل بملف شخصي مكتمل في شات لمة الرائع 🌟. أهلاً وسهلاً بالجميع.";
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
          className="fixed top-24 left-4 md:left-auto md:right-1/4 w-[300px] bg-[#070b09]/98 border border-green-500/30 rounded-3xl overflow-hidden shadow-[0_10px_50px_rgba(16,185,129,0.25)] flex flex-col z-[101] cursor-move text-right"
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
          <div className="flex items-center justify-between p-3 border-b border-green-500/10 bg-black/40 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <h3 className="font-sans font-black text-white text-xs">
                الملف الشخصي والبيانات
              </h3>
            </div>
            <button
              onClick={handlers.onClose}
              className="p-1.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
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
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-2 select-none shrink-0">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-3xl font-bold">
                {target.avatar || "👤"}
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

            {/* Bio area */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[#a3e635] uppercase select-none">
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
                    className="w-full h-20 p-2 bg-black/50 border border-green-500/20 rounded-xl text-[10px] text-white focus:outline-none focus:border-green-500/50 resize-none text-right placeholder-gray-600 font-bold"
                  />
                  <div className="text-[8px] text-gray-500 font-bold select-none">
                    * هذه سيرتك الذاتية المعتمدة، يمكنك تعديلها مباشرةً وتظهر
                    للأعضاء الآخرين فوراً 💾!
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-black/35 rounded-xl border border-white/5 text-[10px] text-gray-300 leading-relaxed break-words font-semibold text-right">
                  {getSimulatedBio(target.nickname)}
                </div>
              )}
            </div>

            {/* Extra Simulated Metadata of Profile details */}
            <div className="space-y-1 mt-1">
              <label className="text-[9px] font-black text-gray-400 uppercase select-none">
                تفاصيل العضوية المعتمدة:
              </label>
              <div className="p-2 bg-black/20 rounded-xl border border-white/5 space-y-1.5 text-[9px] font-mono text-gray-400 select-none">
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
                  <span className="text-gray-500">حالة التفاعل:</span>{" "}
                  <span className="text-green-400 font-extrabold">
                    مشارك نشط بالتجانس
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
                className="w-full flex items-center justify-center gap-1.5 p-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-xl text-center text-[10px] font-black transition-all border border-blue-500/30 cursor-pointer shadow-md select-none shrink-0"
              >
                💬 فتح محادثة خاصة (الخاص)
              </button>
            )}

            {/* Quick actions inside bio pop details */}
            <div className="flex gap-2 select-none mt-1 shrink-0">
              <button
                type="button"
                onClick={() => handlers.onBackToContext(target)}
                className="flex-1 py-1.5 px-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-[9px] font-bold border border-green-500/20 text-center transition-all cursor-pointer"
              >
                🔙 رجوع لخيارات العضو
              </button>
              <button
                type="button"
                onClick={handlers.onClose}
                className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[9px] font-bold border border-red-500/20 text-center transition-all cursor-pointer"
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
