// DesignStudio — a professional, no-code design tool that lets the owner
// craft a complete look for the chat: preset themes, colors, message bubbles,
// typography, glow/frame, column backgrounds, and app background.
// Changes apply live; designs can be saved, exported to JSON, and imported.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Palette,
  Columns3,
  Sparkles,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Power,
  Trash2,
  Check,
  Download,
  Upload,
  MessageCircle,
  Type,
  Layers,
} from "lucide-react";
import {
  applyFace,
  loadFace,
  saveFace,
  loadSavedFaces,
  persistSavedFaces,
  DEFAULT_FACE,
  FACE_PRESETS,
  type CustomFace,
  type SavedFace,
} from "../../lib/customFace";

interface DesignStudioModalProps {
  isOwnerRole: boolean;
}

type StudioTab = "presets" | "colors" | "bubbles" | "typography" | "columns" | "glow" | "background";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-300">{label}</span>
        <span className="text-[9px] font-mono text-gray-500 uppercase">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-11 h-9 rounded-lg cursor-pointer bg-transparent lamma-input-shell"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={30}
          dir="ltr"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[11px] text-white font-mono focus:outline-none lamma-input-shell"
        />
      </div>
      {hint && <p className="text-[9px] text-gray-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

function RgbaRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-300">{label}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        placeholder="مثال: rgba(218,165,32,0.30) أو #d4a63a"
        className="w-full px-3 py-2 rounded-lg text-[11px] text-white font-mono focus:outline-none lamma-input-shell"
      />
      {hint && <p className="text-[9px] text-gray-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

function ColumnEditor({
  label,
  emoji,
  color,
  image,
  onColor,
  onImage,
}: {
  label: string;
  emoji: string;
  color: string;
  image: string;
  onColor: (v: string) => void;
  onImage: (v: string) => void;
}) {
  return (
    <div className="p-3 rounded-2xl space-y-3 lamma-admin-card">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <span className="text-[11px] font-black text-white">{label}</span>
      </div>
      <ColorRow label="لون الخلفية" value={color} onChange={onColor} />
      <div className="flex items-center gap-2 p-1.5 rounded-lg lamma-input-shell">
        <ImageIcon size={13} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={image}
          onChange={(e) => onImage(e.target.value)}
          placeholder="رابط صورة خلفية للعمود (اختياري)..."
          dir="ltr"
          className="flex-1 bg-transparent border-none text-[11px] text-white px-1 focus:outline-none"
        />
        {image.trim() !== "" && (
          <button
            type="button"
            onClick={() => onImage("")}
            className="text-[9px] text-red-300 font-bold px-2 py-0.5 rounded hover:text-red-200"
          >
            مسح
          </button>
        )}
      </div>
    </div>
  );
}

// Live mini-preview showing real chat messages in the chosen design
function LivePreview({ face }: { face: CustomFace }) {
  const bg = useMemo(() => {
    const url = face.appBgImage?.trim();
    if (url) return `center / cover no-repeat url("${url}")`;
    return face.appBg;
  }, [face.appBg, face.appBgImage]);

  const centerBg = useMemo(() => {
    const url = face.centerImage?.trim();
    if (url) return `center / cover no-repeat url("${url}")`;
    return face.centerColor;
  }, [face.centerColor, face.centerImage]);

  const radius = `${Math.max(0, Math.min(32, face.bubbleRadius))}px`;
  const font = face.fontFamily || "Cairo";

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 relative"
      style={{ background: bg, fontFamily: `"${font}", "Cairo", sans-serif` }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl pointer-events-none"
        style={{
          backgroundColor: face.glow,
          opacity: Math.max(0.08, Math.min(1, face.glowStrength / 100)),
        }}
        aria-hidden
      />

      {/* Header */}
      <div
        className="relative px-4 py-2.5 flex items-center gap-2 border-b border-white/10"
        style={{ background: centerBg }}
      >
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black"
          style={{
            background: `linear-gradient(135deg, ${face.primary}, ${face.accent})`,
            color: face.text,
            border: `1px solid ${face.frame}`,
          }}
        >
          لمة
        </div>
        <span className="text-[11px] font-black" style={{ color: face.text }}>
          غرفة العرب
        </span>
        <span
          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: face.primary, color: face.text, opacity: 0.9 }}
        >
          ● أونلاين
        </span>
      </div>

      {/* Messages */}
      <div className="relative px-3 py-3 space-y-2" style={{ background: centerBg }}>
        {/* Message from other */}
        <div className="flex items-end gap-2 max-w-[80%]">
          <div
            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black"
            style={{ background: `linear-gradient(135deg, ${face.primary}, ${face.accent})`, color: face.text }}
          >
            أ
          </div>
          <div
            className="px-3 py-2 border text-[10px] leading-relaxed"
            style={{
              background: face.otherMsgBg,
              borderColor: face.otherMsgBorder,
              borderRadius: radius,
              color: face.text,
            }}
          >
            مرحبا يا جماعة! 🌙
          </div>
        </div>

        {/* Own message */}
        <div className="flex items-end gap-2 max-w-[80%] mr-auto flex-row-reverse">
          <div
            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black"
            style={{ background: `linear-gradient(135deg, ${face.accent}, ${face.primary})`, color: face.text }}
          >
            أنا
          </div>
          <div
            className="px-3 py-2 border text-[10px] leading-relaxed"
            style={{
              background: face.ownMsgBg,
              borderColor: face.ownMsgBorder,
              borderRadius: radius,
              color: face.text,
            }}
          >
            أهلاً وسهلاً! 👋
          </div>
        </div>

        {/* Another message from other */}
        <div className="flex items-end gap-2 max-w-[75%]">
          <div
            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black"
            style={{ background: `linear-gradient(135deg, ${face.primary}, ${face.accent})`, color: face.text }}
          >
            م
          </div>
          <div
            className="px-3 py-2 border text-[10px] leading-relaxed"
            style={{
              background: face.otherMsgBg,
              borderColor: face.otherMsgBorder,
              borderRadius: radius,
              color: face.text,
            }}
          >
            يسلمووو 💛
          </div>
        </div>
      </div>

      {/* Input area */}
      <div
        className="relative px-3 py-2.5 flex items-center gap-2 border-t border-white/10"
        style={{ background: centerBg }}
      >
        <div
          className="flex-1 px-3 py-1.5 rounded-xl text-[10px] border"
          style={{
            background: face.otherMsgBg,
            borderColor: face.frame,
            color: `${face.text}60`,
          }}
        >
          اكتب رسالة...
        </div>
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: face.primary }}
        >
          <span className="text-[10px]">↑</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DesignStudioModal({ isOwnerRole }: DesignStudioModalProps) {
  const [face, setFace] = useState<CustomFace>(() => loadFace());
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>(() => loadSavedFaces());
  const [tab, setTab] = useState<StudioTab>("presets");
  const [faceName, setFaceName] = useState("");
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Apply + persist live on every change
  useEffect(() => {
    applyFace(face);
    saveFace(face);
  }, [face]);

  const update = <K extends keyof CustomFace>(key: K, value: CustomFace[K]) => {
    setFace((prev) => ({ ...prev, [key]: value }));
    setAppliedPreset(null);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = FACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setFace({ ...preset.face, enabled: true });
    setAppliedPreset(presetId);
  };

  const handleSaveFace = () => {
    const name = faceName.trim() || `وجه ${savedFaces.length + 1}`;
    const entry: SavedFace = {
      id: `face-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      face: { ...face, enabled: true },
    };
    const next = [entry, ...savedFaces];
    setSavedFaces(next);
    persistSavedFaces(next);
    setFaceName("");
  };

  const handleApplySaved = (entry: SavedFace) => {
    setFace({ ...entry.face, enabled: true });
    setAppliedPreset(null);
  };

  const handleDeleteSaved = (id: string) => {
    const next = savedFaces.filter((f) => f.id !== id);
    setSavedFaces(next);
    persistSavedFaces(next);
  };

  const handleReset = () => {
    setFace({ ...DEFAULT_FACE });
    setAppliedPreset(null);
  };

  // Export current face as JSON file
  const handleExport = () => {
    const name = faceName.trim() || `لمة-وجه-${Date.now()}`;
    const blob = new Blob([JSON.stringify(face, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import face from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Partial<CustomFace>;
        setFace((prev) => ({ ...prev, ...parsed, enabled: true }));
        setAppliedPreset(null);
      } catch {
        // ignore malformed files
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isOwnerRole) {
    return (
      <div className="p-4 rounded-2xl lamma-section-card text-center" dir="rtl">
        <div className="text-[11px] text-gray-300 font-bold">
          استوديو التصميم متاح للمالك فقط.
        </div>
      </div>
    );
  }

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: "presets",    label: "سمات",    icon: <Layers size={12} /> },
    { id: "colors",     label: "الألوان", icon: <Palette size={12} /> },
    { id: "bubbles",    label: "الفقاعات",icon: <MessageCircle size={12} /> },
    { id: "typography", label: "الخطوط",  icon: <Type size={12} /> },
    { id: "columns",    label: "الأعمدة", icon: <Columns3 size={12} /> },
    { id: "glow",       label: "الإضاءة", icon: <Sparkles size={12} /> },
    { id: "background", label: "الخلفية", icon: <ImageIcon size={12} /> },
  ];

  return (
    <div className="space-y-4 select-none" dir="rtl">

      {/* Header + master switch */}
      <div className="p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 lamma-section-card">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl">🎛️</span>
          <div>
            <div className="text-white text-xs font-black">استوديو تصميم الشات</div>
            <div className="text-[10px] text-gray-400 font-bold mt-0.5 leading-relaxed">
              اختار سمة جاهزة أو صمم وجه كامل للشات بدون كود.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => update("enabled", !face.enabled)}
          className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0 ${
            face.enabled ? "lamma-accent-btn text-white" : "lamma-tab-soft"
          }`}
        >
          <Power size={12} />
          {face.enabled ? "الوجه المخصص مفعّل" : "تفعيل الوجه المخصص"}
        </button>
      </div>

      {/* Live preview */}
      <LivePreview face={face} />

      {/* Tabs — scrollable on small screens */}
      <div className="flex items-center gap-1 p-1 rounded-2xl lamma-section-card overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
              tab === t.id ? "lamma-accent-btn text-white" : "lamma-tab-soft"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Presets ── */}
      {tab === "presets" && (
        <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
          <div className="text-[11px] text-cyan-300 font-black">
            اختار سمة كاملة بضغطة واحدة
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FACE_PRESETS.map((preset) => {
              const isActive = appliedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`relative p-3 rounded-2xl text-right transition-all border ${
                    isActive
                      ? "border-cyan-400/60 ring-1 ring-cyan-400/30"
                      : "border-white/10 hover:border-white/20"
                  } lamma-admin-card`}
                >
                  {isActive && (
                    <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                      <Check size={9} className="text-black" />
                    </span>
                  )}
                  {/* Color swatch */}
                  <div
                    className="w-full h-8 rounded-lg mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${preset.face.primary}, ${preset.face.accent})`,
                    }}
                  />
                  <div className="text-[10px] font-black text-white leading-tight">
                    {preset.emoji} {preset.name}
                  </div>
                </button>
              );
            })}
          </div>
          {appliedPreset && (
            <div className="text-[10px] text-cyan-400 font-bold text-center pt-1">
              ✓ تم تطبيق السمة — يمكنك التعديل عليها من التابات التانية
            </div>
          )}
        </div>
      )}

      {/* ── Colors ── */}
      {tab === "colors" && (
        <div className="p-4 rounded-2xl grid sm:grid-cols-2 gap-3 lamma-section-card">
          <ColorRow
            label="اللون الأساسي"
            value={face.primary}
            onChange={(v) => update("primary", v)}
            hint="الأزرار، التمييزات، مؤشر الأونلاين"
          />
          <ColorRow
            label="اللون الثانوي"
            value={face.accent}
            onChange={(v) => update("accent", v)}
            hint="التدرجات والروابط واللمسات"
          />
          <ColorRow
            label="لون النص"
            value={face.text}
            onChange={(v) => update("text", v)}
            hint="النصوص الأساسية في كل الأعمدة"
          />
        </div>
      )}

      {/* ── Bubbles ── */}
      {tab === "bubbles" && (
        <div className="p-4 rounded-2xl space-y-4 lamma-section-card">
          <div className="text-[10px] text-gray-400 font-bold leading-relaxed">
            تحكم في لون فقاعات الرسائل. يمكنك كتابة hex (#d4a63a) أو rgba(218,165,32,0.30).
          </div>

          <div className="p-3 rounded-2xl space-y-3 lamma-admin-card">
            <div className="text-[10px] text-amber-300 font-black">رسائلك أنت</div>
            <RgbaRow
              label="لون الخلفية"
              value={face.ownMsgBg}
              onChange={(v) => update("ownMsgBg", v)}
              hint="خلفية فقاعة رسالتك"
            />
            <RgbaRow
              label="لون الحدود"
              value={face.ownMsgBorder}
              onChange={(v) => update("ownMsgBorder", v)}
              hint="إطار فقاعة رسالتك"
            />
          </div>

          <div className="p-3 rounded-2xl space-y-3 lamma-admin-card">
            <div className="text-[10px] text-blue-300 font-black">رسائل الآخرين</div>
            <RgbaRow
              label="لون الخلفية"
              value={face.otherMsgBg}
              onChange={(v) => update("otherMsgBg", v)}
              hint="خلفية فقاعات رسائل الغير"
            />
            <RgbaRow
              label="لون الحدود"
              value={face.otherMsgBorder}
              onChange={(v) => update("otherMsgBorder", v)}
              hint="إطار فقاعات رسائل الغير"
            />
          </div>

          {/* Border radius */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-300">استدارة الفقاعات</span>
              <span className="text-[9px] font-mono text-gray-500">{face.bubbleRadius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={face.bubbleRadius}
              onChange={(e) => update("bubbleRadius", Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>مربع</span>
              <span>مستدير</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Typography ── */}
      {tab === "typography" && (
        <div className="p-4 rounded-2xl space-y-4 lamma-section-card">
          <div className="text-[11px] text-cyan-300 font-black">اختار خط الشات</div>
          <div className="grid grid-cols-1 gap-2">
            {(["Cairo", "Tajawal", "Space Grotesk"] as const).map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => update("fontFamily", font)}
                className={`p-3 rounded-xl text-right transition-all border flex items-center justify-between ${
                  face.fontFamily === font
                    ? "border-cyan-400/60 ring-1 ring-cyan-400/30 lamma-accent-btn text-white"
                    : "border-white/10 lamma-admin-card hover:border-white/20"
                }`}
              >
                <div>
                  <div
                    className="text-sm font-bold mb-0.5"
                    style={{ fontFamily: `"${font}", sans-serif` }}
                  >
                    {font === "Cairo" && "مرحباً بكم في لمة — Welcome"}
                    {font === "Tajawal" && "مرحباً بكم في لمة — Welcome"}
                    {font === "Space Grotesk" && "مرحباً في لمة — Lamma Chat"}
                  </div>
                  <div className="text-[9px] text-gray-400 font-mono">{font}</div>
                </div>
                {face.fontFamily === font && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Columns ── */}
      {tab === "columns" && (
        <div className="grid md:grid-cols-3 gap-3">
          <ColumnEditor
            label="العمود الأيمن (الغرف والأعضاء)"
            emoji="👥"
            color={face.rightColor}
            image={face.rightImage}
            onColor={(v) => update("rightColor", v)}
            onImage={(v) => update("rightImage", v)}
          />
          <ColumnEditor
            label="العمود الأوسط (الشات)"
            emoji="💬"
            color={face.centerColor}
            image={face.centerImage}
            onColor={(v) => update("centerColor", v)}
            onImage={(v) => update("centerImage", v)}
          />
          <ColumnEditor
            label="العمود الأيسر (المتجر والراديو)"
            emoji="🛍️"
            color={face.leftColor}
            image={face.leftImage}
            onColor={(v) => update("leftColor", v)}
            onImage={(v) => update("leftImage", v)}
          />
        </div>
      )}

      {/* ── Glow ── */}
      {tab === "glow" && (
        <div className="p-4 rounded-2xl space-y-4 lamma-section-card">
          <ColorRow
            label="لون الإضاءة (Glow)"
            value={face.glow}
            onChange={(v) => update("glow", v)}
            hint="اللمعة والتوهج حوالين العناصر"
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-300">قوة الإضاءة</span>
              <span className="text-[9px] font-mono text-gray-500">{face.glowStrength}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={face.glowStrength}
              onChange={(e) => update("glowStrength", Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>
          <ColorRow
            label="لون الفريم / الجدران"
            value={face.frame}
            onChange={(v) => update("frame", v)}
            hint="الفواصل، الإطارات، والماسورة حوالين الأعمدة"
          />
        </div>
      )}

      {/* ── Background ── */}
      {tab === "background" && (
        <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
          <ColorRow
            label="لون الخلفية العامة"
            value={face.appBg}
            onChange={(v) => update("appBg", v)}
            hint="الخلفية اللي ورا الأعمدة كلها"
          />
          <div className="flex items-center gap-2 p-1.5 rounded-lg lamma-input-shell">
            <ImageIcon size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={face.appBgImage}
              onChange={(e) => update("appBgImage", e.target.value)}
              placeholder="رابط صورة للخلفية العامة (اختياري)..."
              dir="ltr"
              className="flex-1 bg-transparent border-none text-[11px] text-white px-1 focus:outline-none"
            />
            {face.appBgImage.trim() !== "" && (
              <button
                type="button"
                onClick={() => update("appBgImage", "")}
                className="text-[9px] text-red-300 font-bold px-2 py-0.5 rounded hover:text-red-200"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Save / Export / Import ── */}
      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
        <div className="text-[11px] text-cyan-300 font-black">احفظ وجهك</div>

        {/* Name + Save */}
        <div className="flex gap-2 p-2 rounded-xl lamma-admin-card">
          <input
            type="text"
            value={faceName}
            onChange={(e) => setFaceName(e.target.value)}
            placeholder="اسم الوجه (مثال: ليلي بنفسجي)..."
            className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSaveFace}
            className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1 lamma-accent-btn"
          >
            <Save size={12} />
            حفظ
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1 lamma-tab-soft hover:text-white"
          >
            <RotateCcw size={12} />
            تصفير
          </button>
        </div>

        {/* Export / Import */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 lamma-tab-soft hover:text-white"
          >
            <Download size={12} />
            تصدير JSON
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 lamma-tab-soft hover:text-white"
          >
            <Upload size={12} />
            استيراد JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
            aria-hidden
          />
        </div>

        {/* Saved faces */}
        {savedFaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {savedFaces.map((entry) => (
              <div key={entry.id} className="p-3 rounded-2xl space-y-2 lamma-admin-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${entry.face.primary}, ${entry.face.accent})`,
                      }}
                      aria-hidden
                    />
                    <span className="text-[11px] text-white font-black">{entry.name}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono">
                    {new Date(entry.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
                {/* Mini color strip */}
                <div
                  className="w-full h-2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${entry.face.primary}, ${entry.face.accent}, ${entry.face.glow})`,
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplySaved(entry)}
                    className="py-2 rounded-xl text-[10px] font-black text-white transition-all flex items-center justify-center gap-1 lamma-accent-btn"
                  >
                    <Check size={12} />
                    تطبيق
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(entry.id)}
                    className="py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 lamma-danger-btn"
                  >
                    <Trash2 size={12} />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DesignStudioModal;
