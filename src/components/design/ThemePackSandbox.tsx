import React, { useMemo } from "react";
import { Eye, Sparkles } from "lucide-react";
import type { DesignImportPack } from "../../services/design/designImportCatalog";
import { buildPackStyleConfig } from "../../services/design/designPackStylePresets";
import { GLASS_FORM_PRESETS } from "../../services/design/glassTransparencyService";
import type { ColumnCardStyleId } from "../../services/design/columnCardStyleService";

interface ThemePackSandboxProps {
  pack: DesignImportPack | null;
  onApplyToSite?: () => void;
  isPending?: boolean;
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "110, 231, 183";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function ThemePackSandbox({
  pack,
  onApplyToSite,
  isPending,
}: ThemePackSandboxProps) {
  const config = useMemo(
    () => (pack ? buildPackStyleConfig(pack) : null),
    [pack],
  );

  if (!pack || !config) {
    return (
      <div className="theme-pack-sandbox p-6 text-center" dir="rtl">
        <Sparkles size={20} className="mx-auto text-gray-500 mb-2" />
        <p className="text-[10px] font-bold text-gray-500">
          اختر ثيمًا لمعاينة الألوان والبطاقات بشكل مستقل — بدون ألوان الموقع الحالية
        </p>
      </div>
    );
  }

  const cardShape = (pack.columnCardStyleId ?? "frosted") as ColumnCardStyleId;
  const glassPreset = pack.glassFormId
    ? GLASS_FORM_PRESETS.find((p) => p.id === pack.glassFormId)
    : null;
  const tintRgb = hexToRgb(pack.tintHex ?? config.palette.accent);
  const isNeon = config.buttons.neon;

  const styleVars = {
    "--tps-bg": config.palette.bg,
    "--tps-surface": config.palette.surface,
    "--tps-accent": config.palette.accent,
    "--tps-accent-2": config.palette.accent2,
    "--tps-text": config.palette.text,
    "--tps-muted": config.palette.muted,
    "--tps-btn-radius": `${config.buttons.radiusPx}px`,
    "--tps-glass-blur": `${config.glass.blurPx}px`,
    "--tps-tint-rgb": tintRgb,
  } as React.CSSProperties;

  const swatches = [
    config.palette.bg,
    config.palette.surface,
    config.palette.accent,
    config.palette.accent2,
    config.palette.text,
  ];

  return (
    <div className="theme-pack-sandbox" style={styleVars} dir="rtl">
      <div
        className="theme-pack-sandbox-scene"
        style={{ background: pack.previewGradient }}
      >
        <div className="theme-pack-sandbox-header">
          <span>{pack.emoji} {pack.title}</span>
          <span className="text-[7px] opacity-70">معاينة معزولة</span>
        </div>

        <div className="theme-pack-sandbox-body">
          <div className="theme-pack-sandbox-sidebar">
            <div className="theme-pack-sandbox-card" data-shape={cardShape}>
              VIP
            </div>
            <div className="theme-pack-sandbox-card" data-shape={cardShape}>
              راديو
            </div>
          </div>

          <div className="theme-pack-sandbox-chat">
            <div className="theme-pack-sandbox-bubble theme-pack-sandbox-bubble--other">
              مرحبًا — هكذا تبدو الرسائل
            </div>
            <div className="theme-pack-sandbox-bubble theme-pack-sandbox-bubble--mine">
              رسالتك بلون الثيم
            </div>
            <div className="theme-pack-sandbox-composer">
              <div className="theme-pack-sandbox-input">اكتب رسالة…</div>
              <button type="button" className="theme-pack-sandbox-btn">
                إرسال
              </button>
            </div>
          </div>
        </div>

        {glassPreset && (
          <div className="theme-pack-sandbox-glass-panel">
            🪟 {glassPreset.title} — {glassPreset.subtitle}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="theme-pack-sandbox-btn"
            data-variant={isNeon ? "neon" : undefined}
          >
            زر أساسي
          </button>
          <button
            type="button"
            className="theme-pack-sandbox-btn"
            data-variant={config.buttons.radiusPx >= 24 ? "pill" : undefined}
          >
            ثانوي
          </button>
        </div>

        <div className="theme-pack-sandbox-swatches">
          {swatches.map((color) => (
            <span
              key={color}
              className="theme-pack-sandbox-swatch"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="theme-pack-sandbox-meta space-y-2">
        <p className="text-[8px] text-gray-400 font-bold leading-relaxed">
          {pack.subtitle}
        </p>
        <div className="flex flex-wrap gap-1">
          {pack.glassFormId && (
            <span className="px-1.5 py-0.5 rounded text-[7px] bg-white/5 text-cyan-300">
              زجاج: {pack.glassFormId}
            </span>
          )}
          {pack.columnCardStyleId && (
            <span className="px-1.5 py-0.5 rounded text-[7px] bg-white/5 text-violet-300">
              بطاقة: {pack.columnCardStyleId}
            </span>
          )}
        </div>
        {onApplyToSite && (
          <button
            type="button"
            onClick={onApplyToSite}
            className={`w-full py-2 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5 ${
              isPending
                ? "bg-amber-500/90 text-black"
                : "lamma-accent-btn text-white"
            }`}
          >
            <Eye size={12} />
            {isPending ? "معاينة نشطة على الموقع" : "معاينة على الموقع"}
          </button>
        )}
      </div>
    </div>
  );
}
