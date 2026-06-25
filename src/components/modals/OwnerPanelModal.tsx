import React, { useState } from "react";
import { Eye, EyeOff, Settings as SettingsIcon, VolumeX, MessageCircle, Send } from "lucide-react";

interface OwnerPanelProps {
  isSpyMode: boolean;
  setIsSpyMode: (val: boolean) => void;
  isMaintenanceMode: boolean;
  setIsMaintenanceMode: (val: boolean) => void;
  isGlobalMute: boolean;
  setIsGlobalMute: (val: boolean) => void;
  isGlobalMicMute: boolean;
  setIsGlobalMicMute: (val: boolean) => void;
  isOnlyVIPCanSendImages: boolean;
  setIsOnlyVIPCanSendImages: (val: boolean) => void;
  isAdsEnabled: boolean;
  setIsAdsEnabled: (val: boolean) => void;
  isGhostMode: boolean;
  setIsGhostMode: (val: boolean) => void;
  isBotSilent: boolean;
  setIsBotSilent: (val: boolean) => void;
  bannedWords: string[];
  setBannedWords: React.Dispatch<React.SetStateAction<string[]>>;
  addSystemActivityLog: (type: any, userNickname: string, details: string, operator?: string) => void;
  currentUserNickname: string;
  setBrandLogoUrl: (val: string | null) => void;
  setOwnerBgImage: (val: string | null) => void;
  onSendAdminMessage?: (targetNickname: string, message: string) => void;
}

export function OwnerPanelModal({
  isSpyMode,
  setIsSpyMode,
  isMaintenanceMode,
  setIsMaintenanceMode,
  isGlobalMute,
  setIsGlobalMute,
  isGlobalMicMute,
  setIsGlobalMicMute,
  isOnlyVIPCanSendImages,
  setIsOnlyVIPCanSendImages,
  isAdsEnabled,
  setIsAdsEnabled,
  isGhostMode,
  setIsGhostMode,
  isBotSilent,
  setIsBotSilent,
  bannedWords,
  setBannedWords,
  addSystemActivityLog,
  currentUserNickname,
  setBrandLogoUrl,
  setOwnerBgImage,
  onSendAdminMessage,
}: OwnerPanelProps) {
  const [targetNickname, setTargetNickname] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const handleSendAdminMessage = () => {
    if (!targetNickname.trim() || !adminMessage.trim()) {
      alert("الرجاء إدخال اسم المستخدم والرسالة");
      return;
    }
    
    if (onSendAdminMessage) {
      onSendAdminMessage(targetNickname.trim(), adminMessage.trim());
      setTargetNickname("");
      setAdminMessage("");
      alert("تم إرسال الرسالة من الأدمن بنجاح!");
    }
  };

  return (
    <div className="space-y-6 select-none" dir="rtl">
      <div className="rounded-2xl p-4 text-center lamma-soft-warn">
        <h4 className="text-sm font-black text-yellow-500 mb-2">
          غرفة التحكم الخاصة بالمالك فقط
        </h4>
        <p className="text-[10px] text-gray-400">
          أي تغيير هنا يطبق فورا بالقوة الجبرية على كل الغرف والأعضاء.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Spy Mode */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card border border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[13px]">🕵️</span>
                وضع المراقبة السرية للخاص
              </span>
            </span>
            <button
              onClick={() => {
                setIsSpyMode(!isSpyMode);
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isSpyMode ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
            >
              {isSpyMode ? "مفعل" : "معطل"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            يسمح للمالك بمراقبة كل الرسائل الخاصة للجميع بشكل خفي ودمجها في قائمة الخاص لديك برمز التخفي.
          </p>
        </div>

        {/* Send Admin Message */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle size={13} className="text-emerald-300" />
                إرسال رسالة من الأدمن
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="اسم المستخدم"
              value={targetNickname}
              onChange={(e) => setTargetNickname(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
            <textarea
              placeholder="الرسالة من الأدمن"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              rows={2}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <button
              onClick={handleSendAdminMessage}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 text-[10px] font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <Send size={12} />
              إرسال الرسالة
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            إرسال رسالة خاصة من الأدمن للمستخدم المحدد.
          </p>
        </div>

        {/* Maintenance */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              <span className="inline-flex items-center gap-1.5">
                <SettingsIcon size={13} className="text-yellow-300" />
                وضع الصيانة الشامل
              </span>
            </span>
            <button
              onClick={() => {
                const newVal = !isMaintenanceMode;
                setIsMaintenanceMode(newVal);
                addSystemActivityLog(
                  "promote",
                  currentUserNickname,
                  `قام المالك ${newVal ? "بتفعيل" : "بإلغاء"} وضع الصيانة الشامل لكامل المنصة.`,
                );
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isMaintenanceMode ? "lamma-danger-btn" : "lamma-soft-action text-gray-300"}`}
            >
              {isMaintenanceMode ? "إيقاف الصيانة" : "تفعيل"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            يمنع الجميع من الدردشة باستثناء المالك والـ Admins.
          </p>
        </div>

        {/* Global Mute */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              <span className="inline-flex items-center gap-1.5">
                <VolumeX size={13} className="text-red-300" />
                كتم الشات العام
              </span>
            </span>
            <button
              onClick={() => {
                const newVal = !isGlobalMute;
                setIsGlobalMute(newVal);
                addSystemActivityLog(
                  "ban",
                  currentUserNickname,
                  `قام المالك ${newVal ? "بكتم" : "بفتح"} الشات العام على الجميع.`,
                );
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isGlobalMute ? "lamma-danger-btn" : "lamma-soft-action text-gray-300"}`}
            >
              {isGlobalMute ? "إلغاء الكتم" : "كتم للكل"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            منع جميع الأعضاء من الكتابة (شات كتابي).
          </p>
        </div>

        {/* Global Mic Mute */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              🎙️ حظر المايكروفون العام
            </span>
            <button
              onClick={() => {
                const newVal = !isGlobalMicMute;
                setIsGlobalMicMute(newVal);
                addSystemActivityLog(
                  "ban",
                  currentUserNickname,
                  `قام المالك ${newVal ? "بحظر" : "بإلغاء حظر"} المايكروفون العام والصوتيات.`,
                );
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isGlobalMicMute ? "lamma-danger-btn" : "lamma-soft-action text-gray-300"}`}
            >
              {isGlobalMicMute ? "السماح بالمايك" : "حظر المايك"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            إلغاء خاصية إرسال المقاطع الصوتية في كل الغرف.
          </p>
        </div>

        {/* VIP Images Only */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              🖼️ الصور للـ VIP فقط
            </span>
            <button
              onClick={() => {
                const newVal = !isOnlyVIPCanSendImages;
                setIsOnlyVIPCanSendImages(newVal);
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isOnlyVIPCanSendImages ? "lamma-toggle-on" : "lamma-soft-action text-gray-300"}`}
            >
              {isOnlyVIPCanSendImages ? "مفعل (VIP)" : "الجميع"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            قصر ميزة إرسال الصور والفيديوهات على الداعمين والـ VIP.
          </p>
        </div>

        {/* Ads Bar */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card border border-yellow-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              📢 شريط الإعلانات
            </span>
            <button
              onClick={() => {
                const newVal = !isAdsEnabled;
                setIsAdsEnabled(newVal);
                addSystemActivityLog(
                  "promote",
                  currentUserNickname,
                  `قام المالك ${newVal ? "بتفعيل" : "بإخفاء"} شريط الإعلانات.`,
                );
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isAdsEnabled ? "lamma-toggle-on" : "lamma-soft-action text-gray-300"}`}
            >
              {isAdsEnabled ? "ظاهر" : "مخفي"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            إظهار أو إخفاء شريط عروض المتجر أسفل الشات للجميع.
          </p>
        </div>

        {/* Ghost Mode */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card border border-slate-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              {isGhostMode ? <EyeOff size={13} className="text-slate-300" /> : <Eye size={13} className="text-slate-300" />}
              وضع الشبح (Ghost Mode)
            </span>
            <button
              onClick={() => {
                const newVal = !isGhostMode;
                setIsGhostMode(newVal);
                addSystemActivityLog(
                  "promote",
                  currentUserNickname,
                  `قام المالك ${newVal ? "بتفعيل" : "بإلغاء"} وضع الشبح — اختفاء من قائمة الأعضاء.`,
                );
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isGhostMode ? "bg-slate-500 text-white" : "lamma-soft-action text-gray-300"}`}
            >
              {isGhostMode ? "خفي" : "ظاهر"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            يخفي المالك من قائمة الأعضاء — يبقى متصلاً دون أن يراه أحد.
          </p>
        </div>

        {/* Bot Silent */}
        <div className="p-4 rounded-xl flex flex-col gap-2 lamma-admin-card border border-blue-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              🤫 البوت صامت (Silent Mode)
            </span>
            <button
              onClick={() => {
                const newVal = !isBotSilent;
                setIsBotSilent(newVal);
                addSystemActivityLog(
                  "promote",
                  currentUserNickname,
                  `قام المالك ${newVal ? "بكتم" : "بتفعيل"} رسائل البوتات.`,
                );
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isBotSilent ? "bg-blue-500/70 text-white" : "lamma-soft-action text-gray-300"}`}
            >
              {isBotSilent ? "صامت" : "ناشط"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            إيقاف جميع رسائل البوتات التلقائية بدون تعطيل الحماية نفسها.
          </p>
        </div>
      </div>


      {/* Change Primary App logo / icon */}
      <div className="p-4 rounded-xl space-y-3 mt-4 lamma-section-card">
        <h5 className="text-xs font-bold text-emerald-400">
          🎨 تعديل أيقونة التطبيق واستبدال التصميم
        </h5>
        <p className="text-[10px] text-gray-400">
          تغيير الأيقونة السيادية ورابط خلفية الشات لجميع المستخدمين.
        </p>

        {/* Logo */}
        <div className="flex p-1.5 rounded-lg mt-2 lamma-admin-card">
          <input
            type="text"
            id="owner_logo_url_input"
            placeholder="رابط أيقونة اللوجو الجديد (URL)..."
            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
          />
          <button
            onClick={() => {
              const inp = document.getElementById(
                "owner_logo_url_input",
              ) as HTMLInputElement;
              if (inp && inp.value.trim() !== "") {
                setBrandLogoUrl(inp.value.trim());
                alert(
                  "تم تحديث أيقونة التطبيق بنجاح! سيتم تطبيقها لجميع المستخدمين.",
                );
                addSystemActivityLog(
                  "promote",
                  currentUserNickname,
                  "قام المالك بتحديث أيقونة التطبيق السيادية.",
                );
              } else {
                setBrandLogoUrl(null);
                alert("تم استعادة الأيقونة الافتراضية.");
              }
            }}
            className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-feature-primary"
          >
            تحديث اللوجو
          </button>
        </div>

        {/* Background */}
        <div className="flex p-1.5 rounded-lg mt-3 lamma-admin-card">
          <input
            type="text"
            id="owner_bg_url_input"
            placeholder="رابط صورة لتبديل تصميم الخلفية (URL)..."
            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
          />
          <button
            onClick={() => {
              const inp = document.getElementById(
                "owner_bg_url_input",
              ) as HTMLInputElement;
              if (inp && inp.value.trim() !== "") {
                setOwnerBgImage(inp.value.trim());
                alert("تم تطبيق تصميم الخلفية السيادي بنجاح!");
                addSystemActivityLog(
                  "promote",
                  currentUserNickname,
                  "قام المالك بتغيير تصميم خلفية الشات.",
                );
              } else {
                setOwnerBgImage(null);
                alert("تم استعادة تصميم الخلفية الافتراضية.");
              }
            }}
            className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
          >
            تحديث التصميم
          </button>
        </div>
      </div>

      {/* Word Wall Firewall */}
      <div className="p-4 rounded-xl space-y-3 mt-4 lamma-soft-danger">
        <h5 className="text-xs font-bold text-red-500">
          🧱 جدار حماية الشات القوي (Word Wall)
        </h5>
        <p className="text-[10px] text-gray-400">
          إضافة كلمات ممنوعة إلى جدار حماية اللمة لمنع أي رسائل تحتوي عليها وطرد مرسلها فوراً.
        </p>
        <div className="flex p-1.5 rounded-lg lamma-admin-card">
          <input
            type="text"
            id="owner_word_wall_input"
            placeholder="أدخل الكلمة الممنوعة هنا..."
            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
          />
          <button
            onClick={() => {
              const inp = document.getElementById(
                "owner_word_wall_input",
              ) as HTMLInputElement;
              const word = inp?.value.trim();
              if (word) {
                if (!bannedWords.includes(word)) {
                  setBannedWords((prev) => [...prev, word]);
                  alert(`تم إضافة الكلمة "${word}" لجدار الحماية!`);
                  addSystemActivityLog(
                    "ban",
                    currentUserNickname,
                    `قام المالك بإضافة كلمة جديدة لجدار المنع الشامل.`,
                  );
                }
                inp.value = "";
              }
            }}
            className="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all lamma-danger-btn"
          >
            إضافة للجدار
          </button>
        </div>
        {/* Show a few sample words */}
        <div className="flex flex-wrap gap-1 mt-2">
          {bannedWords.slice(0, 8).map((word) => (
            <span
              key={word}
              className="px-2 py-0.5 rounded-md text-red-300 text-[9px] lamma-soft-danger"
            >
              {word}
            </span>
          ))}
          {bannedWords.length > 8 && (
            <span className="text-[10px] text-gray-500">
              +{bannedWords.length - 8} كلمات أخرى
            </span>
          )}
        </div>
      </div>
    </div>
  );
}