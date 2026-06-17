import React from "react";
import { Check, Eye, X } from "lucide-react";
import {
  GLASS_TINT_SWATCHES,
} from "../../services/design/glassTransparencyService";

export type DesignPreviewKind = "glass" | "face" | "template" | "column";

interface DesignPreviewBarProps {
  kind: DesignPreviewKind;
  label: string;
  detail?: string;
  tintHex?: string;
  onTintChange?: (hex: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function DesignPreviewBar({
  kind,
  label,
  detail,
  tintHex = "#6ee7b7",
  onTintChange,
  onCommit,
  onCancel,
}: DesignPreviewBarProps) {
  const stopDrag = (event: React.PointerEvent) => event.stopPropagation();
  const showColorPicker =
    (kind === "glass" || kind === "column") && onTintChange;

  return (
    <div
      className="sticky top-0 z-20 rounded-2xl border border-cyan-400/35 bg-[#0a1218]/95 backdrop-blur-xl p-3 space-y-3 shadow-[0_8px_32px_rgba(34,211,238,0.12)]"
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <Eye size={14} className="text-cyan-300" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-cyan-200">
            معاينة حية — شوف الشات ورا المودال
          </div>
          <div className="text-[9px] text-gray-400 font-bold mt-0.5">
            {label}
            {detail ? ` — ${detail}` : ""}
          </div>
        </div>
      </div>

      {showColorPicker && (
        <div className="space-y-2">
          <div className="text-[9px] font-black text-gray-400">لون البطاقة</div>
          <div className="flex flex-wrap items-center gap-2">
            {GLASS_TINT_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => onTintChange(swatch)}
                onPointerDown={stopDrag}
                aria-label={`لون ${swatch}`}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  tintHex.toLowerCase() === swatch.toLowerCase()
                    ? "border-white ring-2 ring-cyan-400/60 scale-110"
                    : "border-white/25"
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
            <label className="relative flex items-center gap-1.5 px-2 py-1 rounded-xl border border-white/15 bg-white/5 cursor-pointer">
              <input
                type="color"
                value={tintHex}
                onChange={(e) => onTintChange(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                aria-label="اختيار لون مخصص"
              />
              <span className="text-[8px] font-black text-gray-300">مخصص</span>
            </label>
            <span className="px-2 py-1 rounded-lg text-[8px] font-mono font-bold text-gray-400 bg-black/30 border border-white/10">
              {tintHex}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCommit}
          onPointerDown={stopDrag}
          className="flex-1 py-2.5 rounded-xl text-[10px] font-black lamma-accent-btn flex items-center justify-center gap-1.5"
        >
          <Check size={12} />
          تطبيق نهائي
        </button>
        <button
          type="button"
          onClick={onCancel}
          onPointerDown={stopDrag}
          className="px-4 py-2.5 rounded-xl text-[10px] font-black lamma-tab-soft flex items-center justify-center gap-1.5"
        >
          <X size={12} />
          إلغاء
        </button>
      </div>
    </div>
  );
}

/** @deprecated use DesignPreviewBar */
export const DesignGlassPreviewBar = DesignPreviewBar;
