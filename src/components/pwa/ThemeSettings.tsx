// ThemeSettings — beautiful modal that lets the user pick from preset
// themes OR build their own custom palette via color pickers. Live
// preview at the top of the modal reflects the current choice.

import React, { useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Palette, Check, Sparkles, RotateCcw } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { type Theme, type ThemePalette } from "../../lib/themes";

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hint?: string;
}

function ColorField({ label, value, onChange, hint }: ColorFieldProps) {
  const textInputId = useId();

  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={textInputId}
          className="text-[10px] font-black text-gray-400 uppercase tracking-wider"
        >
          {label}
        </label>
        <span className="text-[9px] font-mono text-gray-500 uppercase">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="w-12 h-10 rounded-lg cursor-pointer appearance-none bg-transparent lamma-input-shell"
            style={{ backgroundColor: value }}
          />
          <div
          className="absolute inset-0.5 rounded-md pointer-events-none border border-black/20"
            aria-hidden
          />
        </div>
        <input
            id={textInputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[11px] text-white font-mono focus:outline-none lamma-input-shell"
        />
      </div>
      {hint && (
        <p className="text-[9px] text-gray-500 mt-1 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ThemeSettings({ isOpen, onClose }: ThemeSettingsProps) {
  const { theme, setThemeById, applyCustomPalette, resetTheme, presets } =
    useTheme();
  const [customMode, setCustomMode] = useState(false);
  const [customPalette, setCustomPalette] = useState<ThemePalette>(
    theme.palette,
  );

  useEffect(() => {
    if (!customMode) {
      setCustomPalette(theme.palette);
    }
  }, [theme, customMode]);

  const handleSelectPreset = (preset: Theme) => {
    setCustomMode(false);
    setThemeById(preset.id);
  };

  const handleStartCustom = () => {
    setCustomMode(true);
    // Seed with the active theme's palette.
    setCustomPalette(theme.palette);
    // Switch into custom mode with current colors.
    applyCustomPalette(theme.palette);
  };

  const handleCustomChange = (
    key: keyof ThemePalette,
    value: string,
  ) => {
    const updated: ThemePalette = { ...customPalette, [key]: value };
    // Auto-refresh RGB for primary/accent so glows match.
    if (key === "primary") {
      updated.primaryRgb = hexToRgb(value);
    }
    if (key === "accent") {
      updated.accentRgb = hexToRgb(value);
    }
    setCustomPalette(updated);
    applyCustomPalette({ [key]: value } as Partial<ThemePalette>);
  };

  const handleReset = () => {
    setCustomMode(false);
    resetTheme();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ zIndex: 2147483647 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-3xl rounded-t-3xl lamma-modal-shell"
            dir="rtl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 backdrop-blur-xl lamma-modal-header">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: theme.palette.primary,
                    boxShadow: `0 4px 20px rgba(${theme.palette.primaryRgb}, 0.4)`,
                  }}
                >
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    ثيمات شات لمة
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold">
                    اختار ثيم جاهز أو صمم ثيم خاص بيك 🎨
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl text-gray-300 text-[10px] font-bold flex items-center gap-1.5 transition-all lamma-soft-action"
                  title="إرجاع للثيم الافتراضي"
                >
                  <RotateCcw size={11} />
                  إعادة تعيين
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors lamma-soft-action"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="p-5">
              <div
                className="rounded-2xl p-4 mb-5 relative overflow-hidden lamma-section-card"
                style={{
                  background: `linear-gradient(135deg, ${theme.palette.bg2}, ${theme.palette.bg1})`,
                }}
              >
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-50 pointer-events-none"
                  style={{ backgroundColor: theme.palette.primary }}
                  aria-hidden
                />
                <div className="relative">
                  <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-2">
                    معاينة مباشرة
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black"
                      style={{
                        background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
                        boxShadow: `0 4px 20px rgba(${theme.palette.primaryRgb}, 0.4)`,
                      }}
                    >
                      {theme.emoji}
                    </div>
                    <div>
                      <div
                        className="text-base font-black"
                        style={{ color: theme.palette.text }}
                      >
                        {theme.name}
                      </div>
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: theme.palette.textMuted }}
                      >
                        شات لمة · الدردشة الفورية الآمنة
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: theme.palette.primary,
                        color: theme.palette.bg1,
                      }}
                    >
                      رسالة جديدة
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold border"
                      style={{
                        backgroundColor: "transparent",
                        color: theme.palette.accent,
                        borderColor: theme.palette.accent,
                      }}
                    >
                      اتصال مباشر
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: `${theme.palette.primary}25`,
                        color: theme.palette.text,
                      }}
                    >
                      💚 مثال رسالة
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 mb-4 p-1 rounded-2xl lamma-section-card">
                <button
                  onClick={() => setCustomMode(false)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                    !customMode
                      ? "bg-[var(--theme-primary)] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  ✨ ثيمات جاهزة
                </button>
                <button
                  onClick={handleStartCustom}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                    customMode
                      ? "bg-[var(--theme-primary)] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Sparkles size={11} />
                  ثيم مخصص
                </button>
              </div>

              {/* Presets Grid */}
              {!customMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {presets.map((preset) => {
                    const isActive = theme.id === preset.id && !customMode;
                    return (
                      <motion.button
                        key={preset.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectPreset(preset)}
                        className={`relative p-3 rounded-2xl border text-right transition-all overflow-hidden ${
                          isActive
                            ? "border-[var(--theme-primary)] bg-white/5"
                            : "border-white/10 hover:border-white/20 bg-black/30"
                        }`}
                        style={{
                          boxShadow: isActive
                            ? `0 0 24px rgba(${preset.palette.primaryRgb}, 0.35)`
                            : "none",
                        }}
                      >
                        {/* Mini preview */}
                        <div
                          className="h-16 rounded-xl mb-2 relative overflow-hidden border border-white/10"
                          style={{
                            background: `linear-gradient(135deg, ${preset.palette.bg2}, ${preset.palette.bg1})`,
                          }}
                        >
                          <div
                            className="absolute top-1 right-1 w-6 h-6 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${preset.palette.primary}, ${preset.palette.accent})`,
                            }}
                            aria-hidden
                          />
                          <div
                            className="absolute bottom-1 left-1 right-1 h-1 rounded-full"
                            style={{ backgroundColor: preset.palette.primary }}
                            aria-hidden
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-black text-white">
                              {preset.emoji} {preset.name}
                            </div>
                          </div>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-5 h-5 rounded-full bg-[var(--theme-primary)] flex items-center justify-center"
                            >
                              <Check size={12} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Custom Color Picker */}
              {customMode && (
                <div className="space-y-4 p-4 rounded-2xl lamma-section-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles
                      size={14}
                      style={{ color: theme.palette.primary }}
                    />
                    <h3 className="text-xs font-black text-white">
                      صمم ثيمك بنفسك
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    الإعدادات بتتحفظ تلقائياً وتطبق على طول على التطبيق كله.
                    اللون الأساسي بيأثر على الأزرار والـ highlights، والخلفية
                    على البودي والـ cards.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <ColorField
                      label="اللون الأساسي"
                      value={customPalette.primary}
                      onChange={(v) => handleCustomChange("primary", v)}
                      hint="أزرار، highlights، online indicator"
                    />
                    <ColorField
                      label="اللون الثانوي"
                      value={customPalette.accent}
                      onChange={(v) => handleCustomChange("accent", v)}
                      hint="تدرجات، glows، روابط"
                    />
                    <ColorField
                      label="خلفية عميقة (Bg 1)"
                      value={customPalette.bg1}
                      onChange={(v) => handleCustomChange("bg1", v)}
                      hint="خلفية الصفحة الرئيسية"
                    />
                    <ColorField
                      label="خلفية متوسطة (Bg 2)"
                      value={customPalette.bg2}
                      onChange={(v) => handleCustomChange("bg2", v)}
                      hint="الكروت والمودالات"
                    />
                    <ColorField
                      label="خلفية سطحية (Bg 3)"
                      value={customPalette.bg3}
                      onChange={(v) => handleCustomChange("bg3", v)}
                      hint="الـ inputs والـ surfaces"
                    />
                    <ColorField
                      label="لون النص"
                      value={customPalette.text}
                      onChange={(v) => handleCustomChange("text", v)}
                      hint="النصوص الأساسية"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 p-4 backdrop-blur-xl lamma-modal-header">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-white text-sm font-black transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
                  boxShadow: `0 4px 20px rgba(${theme.palette.primaryRgb}, 0.4)`,
                }}
              >
                تم! 🎉
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Local helper used by the color picker above.
function hexToRgb(hex: string): string {
  const raw = hex.replace("#", "").trim();
  const value =
    raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (value.length !== 6) return "16, 185, 129";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default ThemeSettings;
