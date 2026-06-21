import React, { useMemo } from "react";
import { Eye, Sparkles } from "lucide-react";
import type { UiverseFetchResult } from "../../services/design/uiverseScopedImportService";
import { getRootClassFromCss } from "../../services/design/uiverseCssParser";

interface UiverseCssPreviewProps {
  result: UiverseFetchResult;
  targetLabel?: string | null;
}

export function UiverseCssPreview({ result, targetLabel }: UiverseCssPreviewProps) {
  const rootClass = useMemo(() => getRootClassFromCss(result.css), [result.css]);
  const safeCss = useMemo(() => result.css.slice(0, 48_000), [result.css]);

  return (
    <div
      className="uiverse-css-preview theme-pack-sandbox flex flex-col min-h-[280px]"
      dir="ltr"
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-white/10" dir="rtl">
        <div className="flex items-center gap-1.5 min-w-0">
          <Eye size={12} className="text-cyan-300 shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] font-black text-cyan-200 truncate">
              معاينة UIverse
            </div>
            <div className="text-[7px] text-gray-500 font-bold truncate">
              {result.title ?? "مكوّن مستورد"}
            </div>
          </div>
        </div>
        <span className="text-[6px] font-black px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 shrink-0">
          {result.source}
        </span>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(56,189,248,0.08), transparent 55%), #0a0f18",
        }}
      >
        <div className="uiverse-preview-stage relative inline-flex items-center justify-center max-w-full">
          <style>{safeCss}</style>
          <div
            className="uiverse-preview-markup"
            dangerouslySetInnerHTML={{ __html: result.previewMarkup ?? "" }}
          />
        </div>
      </div>

      <div className="px-2.5 py-2 border-t border-white/10 space-y-1" dir="rtl">
        {rootClass && (
          <p className="text-[7px] text-violet-300/90 font-bold">
            جذر CSS: <span dir="ltr">.{rootClass}</span>
          </p>
        )}
        {targetLabel && (
          <p className="text-[7px] text-emerald-400/90 font-bold">
            الهدف: {targetLabel}
          </p>
        )}
        <p className="text-[7px] text-gray-500 font-bold leading-relaxed flex items-start gap-1">
          <Sparkles size={9} className="shrink-0 mt-0.5 text-gray-600" />
          هذه معاينة المكوّن كما جاء من الرابط — ليست ثيم الموقع.
        </p>
      </div>
    </div>
  );
}
