import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Settings as SettingsIcon, VolumeX } from "lucide-react";

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
}: OwnerPanelProps) {
  // Design Bot System State
  const [selectedColor, setSelectedColor] = useState<string>("theme-cyberpunk");
  const [selectedGlass, setSelectedGlass] = useState<string>("glass-crystal");
  const [selectedLighting, setSelectedLighting] = useState<string>("lighting-led");
  const [hasRgbBorder, setHasRgbBorder] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // UI Library Preview State - 2026 Modern
  const [activeLibraryTab, setActiveLibraryTab] = useState<string>("cards");
  const [selectedCardVariant, setSelectedCardVariant] = useState<string>("card-2026");
  const [selectedStrip, setSelectedStrip] = useState<string>("card-strip-animated");

  const cardVariants = [
    { id: "card-2026", name: "Basic Glass" },
    { id: "card-2026-purple", name: "Purple Gradient" },
    { id: "card-2026-ocean", name: "Ocean Gradient" },
    { id: "card-2026-sunset", name: "Sunset Gradient" },
    { id: "card-2026-forest", name: "Forest Gradient" },
  ];

  const stripStyles = [
    { id: "card-strip-animated", name: "Animated Rainbow" },
    { id: "card-strip-neon", name: "Neon Glow" },
    { id: "card-strip-fire", name: "Fire Animation" },
  ];

  const neonColors = [
    { id: "theme-cyberpunk", name: "Cyberpunk", color: "#ff00ff" },
    { id: "theme-neon-cyan", name: "Neon Cyan", color: "#00ffff" },
    { id: "theme-aurora", name: "Aurora", color: "#00ff88" },
    { id: "theme-deep-purple", name: "Deep Purple", color: "#a855f7" },
    { id: "theme-gold-glow", name: "Gold Glow", color: "#ffd700" },
  ];

  const glassTypes = [
    { id: "glass-soft", name: "Soft Glass" },
    { id: "glass-crystal", name: "Crystal Glowing" },
    { id: "glass-ultra-blur", name: "iOS Ultra Blur" },
  ];

  const lightingTypes = [
    { id: "lighting-led", name: "Moving LED Strip" },
    { id: "lighting-pulse", name: "Soft Neon Pulse" },
    { id: "lighting-aura", name: "Aura Background Glow" },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("lamma_2026_theme_config");
    if (saved) {
      const config = JSON.parse(saved);
      setSelectedColor(config.color || "theme-cyberpunk");
      setSelectedGlass(config.glass || "glass-crystal");
      setSelectedLighting(config.lighting || "lighting-led");
      setHasRgbBorder(config.rgbBorder || false);
    }
  }, []);

  const applyThemeToBody = (color: string, glass: string, lighting: string, rgbBorder: boolean) => {
    const body = document.body;

    // Remove all theme classes
    body.classList.remove(
      ...neonColors.map(c => c.id),
      ...glassTypes.map(g => g.id),
      ...lightingTypes.map(l => l.id),
      "has-rgb-border"
    );

    // Add selected classes
    body.classList.add(color, glass, lighting);
    if (rgbBorder) {
      body.classList.add("has-rgb-border");
    }
  };

  const handlePreview = () => {
    setIsPreviewMode(true);
    applyThemeToBody(selectedColor, selectedGlass, selectedLighting, hasRgbBorder);
  };

  const handleResetPreview = () => {
    setIsPreviewMode(false);
    const body = document.body;
    body.classList.remove(
      ...neonColors.map(c => c.id),
      ...glassTypes.map(g => g.id),
      ...lightingTypes.map(l => l.id),
      "has-rgb-border"
    );
  };

  const handleApplyToPublic = () => {
    const config = { color: selectedColor, glass: selectedGlass, lighting: selectedLighting, rgbBorder: hasRgbBorder };
    localStorage.setItem("lamma_2026_theme_config", JSON.stringify(config));
    applyThemeToBody(selectedColor, selectedGlass, selectedLighting, hasRgbBorder);
    setIsPreviewMode(false);

    addSystemActivityLog(
      "promote",
      currentUserNickname,
      `قام المالك بتطبيق ثيم جديد: ${neonColors.find(c => c.id === selectedColor)?.name} + ${glassTypes.find(g => g.id === selectedGlass)?.name} + ${lightingTypes.find(l => l.id === selectedLighting)?.name}${hasRgbBorder ? " + RGB Border" : ""}`,
    );

    alert("تم تطبيق الثيم على الشات العام بنجاح!");
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

      {/* Design Bot System - Complete Theme Catalog */}
      <div className="p-4 rounded-xl space-y-4 mt-4 lamma-section-card">
        <h5 className="text-xs font-bold text-emerald-400">
          🤖 بوت التصميم 2026
        </h5>
        <p className="text-[10px] text-gray-400">
          نظام متكامل لتخصيص تصميم الشات - اختر الألوان والزجاج والإضاءة.
        </p>

        {/* Live Preview Canvas */}
        <div
          id="live-preview-canvas"
          className={`${isPreviewMode ? "preview-active" : ""}`}
        >
          <div className="preview-header">
            <div className="preview-dot"></div>
            <div className="preview-dot"></div>
            <div className="preview-dot"></div>
          </div>
          <div className="preview-content">
            <div className="preview-message">
              رسالة تجريبية للمعاينة
            </div>
            <button className="preview-button">زر تجريبي</button>
          </div>
        </div>

        {/* RGB Border Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-300">🌈 RGB Border Animation</span>
          </div>
          <button
            onClick={() => setHasRgbBorder(!hasRgbBorder)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              hasRgbBorder
                ? "bg-gradient-to-r from-red-500 via-green-500 to-blue-500 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
          >
            {hasRgbBorder ? "مفعل" : "معطل"}
          </button>
        </div>

        {/* Color Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-300">🎨 ألوان النيون (5 ألوان)</label>
          <div className="grid grid-cols-5 gap-2">
            {neonColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`h-10 rounded-lg border-2 transition-all ${
                  selectedColor === color.id
                    ? "border-white scale-105"
                    : "border-gray-600 hover:border-gray-400"
                }`}
                style={{ backgroundColor: color.color }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Glass Type Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-300">💎 نوع الزجاج (3 أنواع)</label>
          <div className="grid grid-cols-3 gap-2">
            {glassTypes.map((glass) => (
              <button
                key={glass.id}
                onClick={() => setSelectedGlass(glass.id)}
                className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  selectedGlass === glass.id
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {glass.name}
              </button>
            ))}
          </div>
        </div>

        {/* Lighting Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-300">✨ الإضاءة (3 أنواع)</label>
          <div className="grid grid-cols-3 gap-2">
            {lightingTypes.map((lighting) => (
              <button
                key={lighting.id}
                onClick={() => setSelectedLighting(lighting.id)}
                className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  selectedLighting === lighting.id
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {lighting.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isPreviewMode ? (
            <>
              <button
                onClick={handleResetPreview}
                className="flex-1 px-4 py-2 rounded-lg text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                ❌ إلغاء المعاينة
              </button>
              <button
                onClick={handleApplyToPublic}
                className="flex-1 px-4 py-2 rounded-lg text-[11px] font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-all"
              >
                ✅ تطبيق على الشات العام
              </button>
            </>
          ) : (
            <button
              onClick={handlePreview}
              className="w-full px-4 py-2 rounded-lg text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-400 transition-all"
            >
              👁️ معاينة قبل التطبيق
            </button>
          )}
        </div>
      </div>

      {/* 2026 Modern UI Library - Real Working System */}
      <div className="p-4 rounded-xl space-y-4 mt-4 lamma-section-card">
        <h5 className="text-xs font-bold text-purple-400">
          🎨 مكتبة التصميم 2026
        </h5>
        <p className="text-[10px] text-gray-400">
          بطاقات زجاجية حديثة مع أشرطة متحركة داخل العنوان - تصميم حقيقي 2026.
        </p>

        {/* Library Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "cards", name: "🔮 البطاقات الزجاجية" },
            { id: "components", name: "🧩 المكونات" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveLibraryTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                activeLibraryTab === tab.id
                  ? "bg-purple-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Cards Preview */}
        {activeLibraryTab === "cards" && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {cardVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedCardVariant(variant.id)}
                  className={`px-2 py-1.5 rounded text-[9px] font-bold transition-all ${
                    selectedCardVariant === variant.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {stripStyles.map((strip) => (
                <button
                  key={strip.id}
                  onClick={() => setSelectedStrip(strip.id)}
                  className={`px-2 py-1.5 rounded text-[9px] font-bold transition-all ${
                    selectedStrip === strip.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {strip.name}
                </button>
              ))}
            </div>
            <div className="preview-2026">
              <div className={`${selectedCardVariant} w-full max-w-sm`}>
                <div className="card-2026-header">
                  <span className="text-white text-sm font-bold">عنوان البطاقة</span>
                  <div className={selectedStrip}></div>
                </div>
                <div className="card-2026-body">
                  <span className="text-gray-300 text-xs">محتوى البطاقة الزجاجية الحديثة</span>
                  <button className="btn-2026 btn-2026-primary mt-3">زر تجريبي</button>
                </div>
              </div>
              <span className="preview-label-2026">{cardVariants.find(c => c.id === selectedCardVariant)?.name} + {stripStyles.find(s => s.id === selectedStrip)?.name}</span>
            </div>
          </div>
        )}

        {/* Components Preview */}
        {activeLibraryTab === "components" && (
          <div className="space-y-4">
            <div className="preview-2026">
              <input type="text" className="input-2026 mb-3" placeholder="حقل إدخال حديث" />
              <button className="btn-2026 btn-2026-primary">زر أساسي</button>
              <button className="btn-2026 btn-2026-glass mr-2">زر زجاجي</button>
              <span className="preview-label-2026">مكونات UI حديثة 2026</span>
            </div>
          </div>
        )}
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