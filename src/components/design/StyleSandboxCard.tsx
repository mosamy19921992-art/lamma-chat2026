import React, { memo } from "react";
import type { UniversalStyleConfig } from "../../services/design/universalStyleTypes";

interface StyleSandboxCardProps {
  config: UniversalStyleConfig;
  summary: string;
  prompt: string;
  onApply: () => void;
  onCancel: () => void;
  disabled?: boolean;
  isApplying?: boolean;
}

function StyleSandboxCardInner({
  config,
  summary,
  prompt,
  onApply,
  onCancel,
  disabled = false,
  isApplying = false,
}: StyleSandboxCardProps) {
  const chaseActive = config.effects?.sidebarCardChase;
  const headerActive =
    config.effects?.chatHeaderStyle && config.effects.chatHeaderStyle !== "none";
  const styleVars = {
    "--us-surface": config.palette.surface,
    "--us-accent": config.palette.accent,
    "--us-accent-2": config.palette.accent2,
    "--us-text": config.palette.text,
    "--us-glass-blur": `${config.glass.blurPx}px`,
    "--us-btn-radius": `${config.buttons.radiusPx}px`,
    "--us-input-radius": `${config.inputs.radiusPx}px`,
    "--us-chase-speed": `${config.effects?.sidebarChaseSpeedSec ?? 6}s`,
    "--us-chase-tint": config.effects?.sidebarChaseTint ?? "#10b981",
  } as React.CSSProperties;

  return (
    <div
      className="lamma-style-sandbox-card max-w-md"
      style={styleVars}
      data-style-sandbox-preview="true"
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black text-emerald-300 tracking-wide">
            🎨 معاينة حية — {config.label}
          </p>
          <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">{summary}</p>
          {summary.includes("→") ? (
            <p className="lamma-style-sandbox-region-hint mt-2">
              💡 اكتب «مصطلحات» في أي وقت لقائمة أسماء أجزاء الشات
            </p>
          ) : null}
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full bg-white/10 text-gray-300 shrink-0">
          معاينة
        </span>
      </div>

      <div className="lamma-style-sandbox-preview-grid">
        {headerActive ? (
          <div className="lamma-style-sandbox-header-strip col-span-full">
            <div className="lamma-style-sandbox-header-strip-bar">
              هيدر الشات — {config.label}
            </div>
            {config.effects.chatHeaderStyle === "flow-strip" ? (
              <div className="lamma-style-sandbox-header-strip-flow" />
            ) : (
              <div
                className="h-[3px]"
                style={{
                  background:
                    config.effects.chatHeaderStyle === "luxe-gold"
                      ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                      : "rgba(255,255,255,0.2)",
                }}
              />
            )}
            <p className="text-[9px] text-gray-400 p-2 text-center">
              blur {config.effects.chatHeaderBlurPx}px — شوف الشريط العلوي فوق الشات
            </p>
          </div>
        ) : null}
        {chaseActive ? (
          <div className="lamma-style-sandbox-chase-ring col-span-full">
            <div className="lamma-style-sandbox-chase-ring-inner">
              ✨ إضاءة تلف حول بطاقات VIP / الراديو / الغرف في الأعمدة
              {config.effects.sidebarChaseOuterOnly ? (
                <>
                  <br />
                  <span className="text-amber-300/90">
                    خارج البطاقة فقط — بدون انعكاس داخل
                  </span>
                </>
              ) : null}
              <br />
              <span className="text-emerald-300/90">
                سرعة {config.effects.sidebarChaseSpeedSec}s — شوف الأعمدة يمين/يسار الشات
              </span>
            </div>
          </div>
        ) : null}
        {!chaseActive && !headerActive ? (
          <>
            <div className="lamma-style-sandbox-sample">
              <p className="text-[9px] text-gray-400 mb-1">بطاقة زجاجية</p>
              <p className="text-[10px] font-bold text-white">ضباب {config.glass.blurPx}px</p>
              <p className="text-[9px] text-gray-400 mt-1">
                حدود {Math.round(config.glass.borderOpacity * 100)}%
              </p>
            </div>
            <div className="lamma-style-sandbox-sample">
              <p className="text-[9px] text-gray-400 mb-1">زر متوهّج</p>
              <span className="lamma-style-sandbox-neon-btn">
                {config.buttons.neon ? "زر نيون" : "زر ناعم"}
              </span>
            </div>
            <div className="lamma-style-sandbox-sample">
              <p className="text-[9px] text-gray-400 mb-1">حقل إدخال</p>
              <input
                className="lamma-style-sandbox-input"
                readOnly
                tabIndex={-1}
                value="اكتب هنا..."
                aria-hidden
              />
            </div>
          </>
        ) : null}
      </div>

      <p className="text-[9px] text-gray-500 mt-2 truncate" title={prompt}>
        طلبك: {prompt}
      </p>

      <div className="lamma-style-sandbox-actions">
        <button
          type="button"
          className="lamma-style-sandbox-apply"
          disabled={disabled || isApplying}
          onClick={onApply}
        >
          {isApplying ? "⏳ جاري الحفظ..." : "✅ تطبيق على الكل"}
        </button>
        <button
          type="button"
          className="lamma-style-sandbox-cancel"
          disabled={disabled || isApplying}
          onClick={onCancel}
        >
          ✖ إلغاء / تعديل
        </button>
      </div>
    </div>
  );
}

export const StyleSandboxCard = memo(StyleSandboxCardInner);
export default StyleSandboxCard;
