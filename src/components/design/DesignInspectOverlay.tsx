import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ChatDesignRegion, RegionAction } from "../../services/design/chatDesignVocabulary";
import {
  getRegionLabelAr,
  INSPECT_ACTION_LABELS_AR,
  INSPECT_QUICK_ACTIONS,
} from "../../services/design/designInspectService";
import type { DesignInspectSuggestion } from "../../services/design/designInspectSuggestions";
import { getSuggestionCategoryLabel } from "../../services/design/designInspectSuggestions";

export interface DesignInspectOverlayProps {
  active: boolean;
  selectedRegion: ChatDesignRegion | null;
  highlightRect: DOMRect | null;
  lastSummary: string;
  suggestions: DesignInspectSuggestion[];
  hasPendingPreview: boolean;
  isApplying: boolean;
  onAction: (region: ChatDesignRegion, action: RegionAction) => void;
  onCustomPrompt: (region: ChatDesignRegion, prompt: string) => void;
  onApplySuggestion: (suggestion: DesignInspectSuggestion) => void;
  onCommit: () => void;
  onCancel: () => void;
  onExit: () => void;
}

export function DesignInspectOverlay({
  active,
  selectedRegion,
  highlightRect,
  lastSummary,
  suggestions,
  hasPendingPreview,
  isApplying,
  onAction,
  onCustomPrompt,
  onApplySuggestion,
  onCommit,
  onCancel,
  onExit,
}: DesignInspectOverlayProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    if (!active) setCustomPrompt("");
  }, [active, selectedRegion]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onExit]);

  const handleCustomSubmit = useCallback(() => {
    if (!selectedRegion || !customPrompt.trim()) return;
    onCustomPrompt(selectedRegion, customPrompt.trim());
    setCustomPrompt("");
  }, [customPrompt, onCustomPrompt, selectedRegion]);

  if (!active) return null;

  const quickActions = selectedRegion
    ? INSPECT_QUICK_ACTIONS[selectedRegion]
    : [];

  return (
    <div className="design-inspect-overlay" aria-live="polite">
      <div className="design-inspect-hint">
        🎯 انقر على أي جزء في الشات لتحديده — Esc للخروج
      </div>

      {highlightRect ? (
        <div
          className="design-inspect-highlight"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      ) : null}

      <div
        className="design-inspect-panel"
        data-design-inspect-panel="true"
        role="dialog"
        aria-label="لوحة تحديد التصميم"
      >
        <div className="design-inspect-panel__header">
          <div>
            <div className="design-inspect-panel__title">
              {selectedRegion
                ? `🎨 ${getRegionLabelAr(selectedRegion)}`
                : "🎯 وضع التحديد بالماوس"}
            </div>
            {selectedRegion ? (
              <div className="design-inspect-panel__region">
                اختر أمراً سريعاً أو اكتب طلباً مخصصاً
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="design-inspect-panel__close"
            onClick={onExit}
            title="إغلاق وضع التحديد"
            aria-label="إغلاق"
          >
            <X size={14} />
          </button>
        </div>

        {!selectedRegion ? (
          <>
            {suggestions.length > 0 ? (
              <div className="design-inspect-suggestions">
                <div className="design-inspect-suggestions__title">
                  💡 ملاحظات عامة على الشكل الحالي
                </div>
                <div className="design-inspect-suggestions__list">
                  {suggestions.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`design-inspect-suggestion design-inspect-suggestion--${item.tone}`}
                      onClick={() => onApplySuggestion(item)}
                      title={`معاينة: ${item.prompt}`}
                    >
                      <span className="design-inspect-suggestion__badge">
                        {getSuggestionCategoryLabel(item.category)}
                      </span>
                      <span className="design-inspect-suggestion__headline">
                        {item.tone === "warn" ? "⚠️ " : item.tone === "good" ? "✅ " : "💡 "}
                        {item.title}
                      </span>
                      <span className="design-inspect-suggestion__reason">
                        {item.reason}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="design-inspect-empty">
              انقر على الهيدر، الأعمدة، الرسائل، الخلفية، أو شريط الكتابة
              <br />
              لتظهر اقتراحات مخصصة + أوامر سريعة
            </div>
          </>
        ) : (
          <>
            {suggestions.length > 0 ? (
              <div className="design-inspect-suggestions">
                <div className="design-inspect-suggestions__title">
                  💡 اقتراحات البوت — ألوان / خلفية / شكل
                </div>
                <div className="design-inspect-suggestions__list">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`design-inspect-suggestion design-inspect-suggestion--${item.tone}`}
                      onClick={() => onApplySuggestion(item)}
                      title={`معاينة: ${item.prompt}`}
                    >
                      <span className="design-inspect-suggestion__badge">
                        {getSuggestionCategoryLabel(item.category)}
                      </span>
                      <span className="design-inspect-suggestion__headline">
                        {item.tone === "warn" ? "⚠️ " : item.tone === "good" ? "✅ " : "💡 "}
                        {item.title}
                      </span>
                      <span className="design-inspect-suggestion__reason">
                        {item.reason}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="design-inspect-actions">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="design-inspect-action-btn"
                  onClick={() => onAction(selectedRegion, action)}
                >
                  {INSPECT_ACTION_LABELS_AR[action]}
                </button>
              ))}
            </div>

            <div className="design-inspect-custom-row">
              <input
                type="text"
                className="design-inspect-custom-input"
                placeholder="أمر مخصص… مثلاً: زجاج أكثر ضبابية"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomSubmit();
                }}
              />
              <button
                type="button"
                className="design-inspect-action-btn shrink-0"
                onClick={handleCustomSubmit}
                disabled={!customPrompt.trim()}
              >
                معاينة
              </button>
            </div>
          </>
        )}

        {lastSummary ? (
          <div className="design-inspect-summary">{lastSummary}</div>
        ) : null}

        <div className="design-inspect-footer">
          <button
            type="button"
            className="design-inspect-footer-btn design-inspect-footer-btn--apply"
            disabled={!hasPendingPreview || isApplying}
            onClick={onCommit}
          >
            {isApplying ? "جاري الحفظ…" : "✅ تطبيق على الكل"}
          </button>
          <button
            type="button"
            className="design-inspect-footer-btn design-inspect-footer-btn--cancel"
            disabled={!hasPendingPreview || isApplying}
            onClick={onCancel}
          >
            ↩ إلغاء المعاينة
          </button>
        </div>
      </div>
    </div>
  );
}
