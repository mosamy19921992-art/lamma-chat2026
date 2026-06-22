import React, { useMemo } from "react";
import { Eye, Sparkles } from "lucide-react";
import type { UiverseFetchResult } from "../../services/design/uiverseScopedImportService";
import { getRootClassFromCss, sanitizeCss } from "../../services/design/uiverseCssParser";

interface UiverseCssPreviewProps {
  result: UiverseFetchResult;
  targetLabel?: string | null;
}

export function UiverseCssPreview({ result, targetLabel }: UiverseCssPreviewProps) {
  const rootClass = useMemo(() => getRootClassFromCss(result.css), [result.css]);
  // Sanitize CSS (strip @import/expression/behavior/javascript:/data:) — not just length-cap.
  const safeCss = useMemo(() => sanitizeCss(result.css).css, [result.css]);
  // Render untrusted third-party markup + CSS inside a fully sandboxed iframe.
  // sandbox="" disables ALL script execution (including inline on* handlers),
  // and isolates it from the app origin — neutralizing DOM XSS.
  const previewSrcDoc = useMemo(() => {
    const markup = (result.previewMarkup ?? "").slice(0, 12_000);
    return `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:transparent;overflow:hidden;}
  ${safeCss}
</style></head><body>${markup}</body></html>`;
  }, [result.previewMarkup, safeCss]);

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
        <div className="uiverse-preview-stage relative inline-flex items-center justify-center w-full">
          <iframe
            title="UIverse preview (sandboxed)"
            sandbox=""
            referrerPolicy="no-referrer"
            loading="lazy"
            srcDoc={previewSrcDoc}
            className="uiverse-preview-frame w-full min-h-[160px] border-0 bg-transparent"
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
        <p className="text-[7px] text-amber-400/80 font-bold leading-relaxed flex items-start gap-1">
          <Sparkles size={9} className="shrink-0 mt-0.5 text-amber-500" />
          ⚠️ المعاينة تقريبية — الشكل الحقيقي على الموقع قد يختلف بسبب تحويل CSS للعناصر.
        </p>
      </div>
    </div>
  );
}
