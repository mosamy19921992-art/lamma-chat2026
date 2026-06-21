import React from "react";
import { Check, Sparkles } from "lucide-react";
import type { DesignAssistantProposalId, DesignPreset } from "../../lib/chatTypes";
import { FACE_PRESETS, getFacePresetLabel } from "../../lib/customFace";
import {
  GLASS_FACE_TEMPLATE_META,
  READY_DESIGN_TEMPLATES,
} from "../../services/design/designReadyTemplates";
import {
  GLASS_FORM_PRESETS,
  getGlassFormLabel,
  type GlassFormId,
} from "../../services/design/glassTransparencyService";
import {
  DesignPreviewBar,
  type DesignPreviewKind,
} from "./DesignGlassPreviewBar";
import {
  COLUMN_CARD_STYLE_PRESETS,
  getColumnCardStyleLabel,
  type ColumnCardStyleId,
} from "../../services/design/columnCardStyleService";
import {
  BUBBLE_SHAPE_PRESETS,
  getBubbleShapeLabel,
  type BubbleShapeId,
} from "../../services/design/bubbleShapeService";
import {
  CHASE_LIGHT_PRESETS,
  type ChaseLightSettings,
  type ChaseLightStyleId,
  type ChaseLightTarget,
} from "../../services/design/chaseLightBarService";

interface DesignTemplateGalleryProps {
  onPreviewTemplate: (id: DesignAssistantProposalId) => void;
  onPreviewFacePreset: (presetId: string) => void;
  onPreviewGlassForm: (id: GlassFormId) => void;
  onPreviewColumnStyle: (id: ColumnCardStyleId) => void;
  onPreviewBubbleShape: (id: BubbleShapeId) => void;
  onPreviewChaseLight: (target: ChaseLightTarget, styleId: ChaseLightStyleId) => void;
  onCommitPreview: () => void;
  onCancelPreview: () => void;
  onTintChange: (hex: string) => void;
  onResetGlassForm?: () => void;
  previewKind?: DesignPreviewKind | null;
  activeGlassFormId?: GlassFormId | null;
  pendingGlassFormId?: GlassFormId | null;
  tintColor?: string;
  pendingColumnStyleId?: ColumnCardStyleId | null;
  activeColumnStyleId?: ColumnCardStyleId | null;
  pendingBubbleShapeId?: BubbleShapeId | null;
  activeBubbleShapeId?: BubbleShapeId;
  chaseSettings?: ChaseLightSettings;
  pendingChaseSummary?: string;
  pendingFacePresetId?: string | null;
  activeFacePresetId?: string | null;
  pendingTemplateId?: DesignAssistantProposalId | null;
  activeTemplateId?: DesignAssistantProposalId | null;
  pendingTemplateSummary?: string;
  recommendedPresetId?: DesignAssistantProposalId;
  designPresets?: DesignPreset[];
  applyDesignPreset?: (preset: DesignPreset) => void;
  handleDeleteDesignPreset?: (id: string) => void;
  designPresetName?: string;
  setDesignPresetName?: (name: string) => void;
  handleSaveDesignPreset?: () => void;
}

function GlassDesignCard({
  emoji,
  title,
  subtitle,
  previewGradient,
  badge,
  tags,
  isRecommended,
  isActive,
  isPending,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  previewGradient: string;
  badge?: string;
  tags?: string[];
  isRecommended?: boolean;
  isActive?: boolean;
  isPending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border text-right transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
        isPending
          ? "border-amber-400/65 ring-2 ring-amber-400/40 shadow-[0_8px_28px_rgba(251,191,36,0.2)]"
          : isActive
            ? "border-emerald-400/55 ring-1 ring-emerald-400/35"
            : "border-white/10 hover:border-emerald-400/45 hover:shadow-[0_8px_32px_rgba(45,212,191,0.15)]"
      }`}
    >
      <div
        className="relative h-[72px] w-full overflow-hidden"
        style={{ background: previewGradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-0 backdrop-blur-[2px] opacity-40" />
        {isRecommended && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/90 text-black">
            <Sparkles size={9} />
            موصى به
          </span>
        )}
        {badge && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black bg-black/45 text-white/90 border border-white/15">
            {badge}
          </span>
        )}
        {isPending && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black bg-amber-500/90 text-black">
            معاينة
          </span>
        )}
        {isActive && !isPending && (
          <span className="absolute bottom-2 left-2 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
            <Check size={9} className="text-black" />
          </span>
        )}
      </div>
      <div className="p-3 bg-white/[0.06] backdrop-blur-xl border-t border-white/8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-black text-white leading-tight truncate">
              {emoji} {title}
            </div>
            <div className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed line-clamp-2">
              {subtitle}
            </div>
          </div>
          <span className="shrink-0 text-[8px] font-black text-emerald-300/80 opacity-0 group-hover:opacity-100 transition-opacity">
            معاينة ←
          </span>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-white/8 text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function GlassFormCard({
  emoji,
  title,
  subtitle,
  blurLabel,
  previewBackdrop,
  previewPanelBg,
  previewPanelBlur,
  previewPanelBorder,
  isActive,
  isPending,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  blurLabel: string;
  previewBackdrop: string;
  previewPanelBg: string;
  previewPanelBlur: string;
  previewPanelBorder: string;
  isActive?: boolean;
  isPending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border text-right transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
        isPending
          ? "border-amber-400/65 ring-2 ring-amber-400/40 shadow-[0_8px_28px_rgba(251,191,36,0.2)]"
          : isActive
            ? "border-cyan-400/60 ring-1 ring-cyan-400/35 shadow-[0_8px_28px_rgba(34,211,238,0.18)]"
            : "border-white/10 hover:border-cyan-400/40"
      }`}
    >
      <div
        className="relative h-[80px] w-full overflow-hidden flex items-center justify-center p-3"
        style={{ background: previewBackdrop }}
      >
        <div
          className="w-full h-full rounded-xl border shadow-lg"
          style={{
            background: previewPanelBg,
            backdropFilter: previewPanelBlur,
            WebkitBackdropFilter: previewPanelBlur,
            borderColor: previewPanelBorder,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <div className="p-2 space-y-1.5 opacity-90">
            <div className="h-1.5 w-2/3 rounded-full bg-white/35" />
            <div className="h-1.5 w-full rounded-full bg-white/18" />
            <div className="h-1.5 w-4/5 rounded-full bg-white/12" />
          </div>
        </div>
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[7px] font-black bg-black/50 text-cyan-200 border border-white/10">
          blur {blurLabel}
        </span>
        {isPending && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black bg-amber-500/90 text-black">
            معاينة
          </span>
        )}
        {isActive && !isPending && (
          <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
            <Check size={9} className="text-black" />
          </span>
        )}
      </div>
      <div className="p-3 bg-white/[0.06] backdrop-blur-xl border-t border-white/8">
        <div className="text-[11px] font-black text-white leading-tight">
          {emoji} {title}
        </div>
        <div className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed line-clamp-2">
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function ColumnCardStyleCard({
  emoji,
  title,
  subtitle,
  previewRadius,
  previewBg,
  previewBorder,
  isActive,
  isPending,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  previewRadius: string;
  previewBg: string;
  previewBorder: string;
  isActive?: boolean;
  isPending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border text-right transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
        isPending
          ? "border-amber-400/65 ring-2 ring-amber-400/40"
          : isActive
            ? "border-amber-400/55 ring-1 ring-amber-400/30"
            : "border-white/10 hover:border-amber-400/40"
      }`}
    >
      <div className="relative h-[72px] w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0f16] to-[#1a2030]">
        <div
          className="w-full h-10 border-2 shadow-lg"
          style={{
            borderRadius: previewRadius,
            background: previewBg,
            borderColor: previewBorder.includes("gradient") ? "transparent" : previewBorder,
            boxShadow:
              previewBorder.includes("gradient")
                ? "0 0 0 2px rgba(255,42,95,0.5), 0 0 0 4px rgba(16,185,129,0.35)"
                : "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        />
        {isPending && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black bg-amber-500/90 text-black">
            معاينة
          </span>
        )}
      </div>
      <div className="p-3 bg-white/[0.06] border-t border-white/8">
        <div className="text-[11px] font-black text-white">
          {emoji} {title}
        </div>
        <div className="text-[9px] text-gray-400 font-bold mt-1 line-clamp-2">{subtitle}</div>
      </div>
    </button>
  );
}

function getPreviewBarLabel(
  previewKind: DesignPreviewKind | null | undefined,
  pendingGlassFormId: GlassFormId | null | undefined,
  pendingFacePresetId: string | null | undefined,
  pendingTemplateId: DesignAssistantProposalId | null | undefined,
  pendingColumnStyleId: ColumnCardStyleId | null | undefined,
  pendingBubbleShapeId: BubbleShapeId | null | undefined,
  pendingChaseSummary?: string,
): string {
  if (previewKind === "glass" && pendingGlassFormId) {
    return getGlassFormLabel(pendingGlassFormId);
  }
  if (previewKind === "face" && pendingFacePresetId) {
    return getFacePresetLabel(pendingFacePresetId);
  }
  if (previewKind === "template" && pendingTemplateId) {
    const template = READY_DESIGN_TEMPLATES.find((t) => t.id === pendingTemplateId);
    return template ? `${template.emoji} ${template.title}` : pendingTemplateId;
  }
  if (previewKind === "column" && pendingColumnStyleId) {
    return getColumnCardStyleLabel(pendingColumnStyleId);
  }
  if (previewKind === "bubble" && pendingBubbleShapeId) {
    return getBubbleShapeLabel(pendingBubbleShapeId);
  }
  if (previewKind === "chase" && pendingChaseSummary) {
    return pendingChaseSummary;
  }
  return "تصميم";
}

export function DesignTemplateGallery({
  onPreviewTemplate,
  onPreviewFacePreset,
  onPreviewGlassForm,
  onPreviewColumnStyle,
  onPreviewBubbleShape,
  onPreviewChaseLight,
  onCommitPreview,
  onCancelPreview,
  onTintChange,
  onResetGlassForm,
  previewKind = null,
  activeGlassFormId = null,
  pendingGlassFormId = null,
  tintColor = "#6ee7b7",
  pendingColumnStyleId = null,
  activeColumnStyleId = null,
  pendingBubbleShapeId = null,
  activeBubbleShapeId = "default",
  chaseSettings,
  pendingChaseSummary = "",
  pendingFacePresetId = null,
  activeFacePresetId = null,
  pendingTemplateId = null,
  activeTemplateId = null,
  pendingTemplateSummary = "",
  recommendedPresetId,
  designPresets = [],
  applyDesignPreset,
  handleDeleteDesignPreset,
  designPresetName = "",
  setDesignPresetName,
  handleSaveDesignPreset,
}: DesignTemplateGalleryProps) {
  const stopDrag = (event: React.PointerEvent) => event.stopPropagation();
  const isPreviewing = previewKind !== null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-3 lamma-admin-card border border-emerald-500/15">
        <div className="text-[10px] text-gray-300 font-bold leading-relaxed">
          اضغط على أي بطاقة للمعاينة الحية — بما فيها بطاقات الأعمدة (VIP، راديو، غرف).
          اختار لون البطاقة للفورمات وأشكال الأعمدة، ثم «تطبيق نهائي».
        </div>
      </div>

      {isPreviewing && previewKind && (
        <DesignPreviewBar
          kind={previewKind}
          label={getPreviewBarLabel(
            previewKind,
            pendingGlassFormId,
            pendingFacePresetId,
            pendingTemplateId,
            pendingColumnStyleId,
            pendingBubbleShapeId,
            pendingChaseSummary,
          )}
          detail={
            previewKind === "template" && pendingTemplateSummary
              ? pendingTemplateSummary
              : previewKind === "glass" || previewKind === "column" || previewKind === "chase"
                ? "اختار اللون ثم اضغط تطبيق نهائي"
                : previewKind === "bubble"
                  ? "شوف فقاعات الشات والخاص — ثم تطبيق"
                  : undefined
          }
          tintHex={tintColor}
          onTintChange={
            previewKind === "glass" || previewKind === "column" || previewKind === "chase"
              ? onTintChange
              : undefined
          }
          onCommit={onCommitPreview}
          onCancel={onCancelPreview}
        />
      )}

      <div>
        <div className="text-[11px] font-black text-sky-300 mb-2">
          💬 أشكال فقاعات الشات والخاص
        </div>
        <div className="text-[9px] text-gray-500 font-bold mb-2 leading-relaxed">
          WhatsApp · Facebook · iOS · Telegram — للرسائل العامة والخاصة.
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {BUBBLE_SHAPE_PRESETS.map((shape) => (
            <GlassDesignCard
              key={shape.id}
              emoji={shape.emoji}
              title={shape.title}
              subtitle={shape.subtitle}
              previewGradient={
                shape.id === "whatsapp"
                  ? "linear-gradient(145deg, #075e54, #25d366)"
                  : shape.id === "facebook"
                    ? "linear-gradient(145deg, #0084ff, #006aff)"
                    : shape.id === "ios"
                      ? "linear-gradient(145deg, #34c759, #30d158)"
                      : shape.id === "telegram"
                        ? "linear-gradient(145deg, #0088cc, #229ed9)"
                        : "linear-gradient(145deg, #1e293b, #64748b)"
              }
              isActive={activeBubbleShapeId === shape.id && previewKind !== "bubble"}
              isPending={pendingBubbleShapeId === shape.id && previewKind === "bubble"}
              onClick={() => onPreviewBubbleShape(shape.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-[11px] font-black text-pink-300">
          ✨ أشرطة النور — دوران وتوهج
        </div>
        {(
          [
            ["columns", "🃏 بطاقات الأعمدة"],
            ["composer", "⌨️ شريط الكتابة"],
            ["header", "📌 هيدر الشات"],
          ] as const
        ).map(([target, label]) => (
          <div key={target}>
            <div className="text-[9px] font-black text-gray-400 mb-1.5">{label}</div>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-1.5">
              {CHASE_LIGHT_PRESETS.map((style) => {
                const activeId =
                  chaseSettings?.[target as ChaseLightTarget] ?? "conic-spin";
                const isSelected = activeId === style.id;
                return (
                  <button
                    key={`${target}-${style.id}`}
                    type="button"
                    onClick={() => onPreviewChaseLight(target, style.id)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      previewKind === "chase" && isSelected
                        ? "border-amber-400/60 ring-1 ring-amber-400/40 bg-amber-500/10"
                        : isSelected && previewKind !== "chase"
                          ? "border-emerald-400/40 bg-emerald-500/10"
                          : "border-white/10 hover:border-white/25 bg-white/[0.04]"
                    }`}
                  >
                    <div className="text-base">{style.emoji}</div>
                    <div className="text-[7px] font-black text-white truncate">
                      {style.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[11px] font-black text-emerald-300 mb-2">
          🎨 تصاميم ذكية جاهزة
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {READY_DESIGN_TEMPLATES.map((template) => (
            <GlassDesignCard
              key={template.id}
              emoji={template.emoji}
              title={template.title}
              subtitle={template.subtitle}
              previewGradient={template.previewGradient}
              badge={template.impact}
              tags={template.tags}
              isRecommended={recommendedPresetId === template.id}
              isActive={activeTemplateId === template.id && previewKind !== "template"}
              isPending={pendingTemplateId === template.id && previewKind === "template"}
              onClick={() => onPreviewTemplate(template.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-black text-amber-300 mb-2">
          🃏 أشكال بطاقات الأعمدة (VIP · راديو · غرف)
        </div>
        <div className="text-[9px] text-gray-500 font-bold mb-2 leading-relaxed">
          البطاقات الجانبية كانت ثابتة على «حلقة نيون» — دلوقتي تقدر تختار الشكل واللون.
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {COLUMN_CARD_STYLE_PRESETS.map((style) => (
            <ColumnCardStyleCard
              key={style.id}
              emoji={style.emoji}
              title={style.title}
              subtitle={style.subtitle}
              previewRadius={style.previewRadius}
              previewBg={style.previewBg}
              previewBorder={style.previewBorder}
              isActive={
                (activeColumnStyleId === style.id ||
                  (style.id === "neon-ring" && !activeColumnStyleId)) &&
                previewKind !== "column"
              }
              isPending={pendingColumnStyleId === style.id && previewKind === "column"}
              onClick={() => onPreviewColumnStyle(style.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[11px] font-black text-violet-300">
            🧊 فورمات الشفافية (Glass Forms)
          </div>
          {onResetGlassForm && activeGlassFormId && (
            <button
              type="button"
              onClick={onResetGlassForm}
              onPointerDown={stopDrag}
              className="px-2.5 py-1 rounded-lg text-[9px] font-black lamma-tab-soft hover:text-white"
            >
              ↩ افتراضي
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {GLASS_FORM_PRESETS.map((form) => (
            <GlassFormCard
              key={form.id}
              emoji={form.emoji}
              title={form.title}
              subtitle={form.subtitle}
              blurLabel={form.blurLabel}
              previewBackdrop={form.previewBackdrop}
              previewPanelBg={form.previewPanelBg}
              previewPanelBlur={form.previewPanelBlur}
              previewPanelBorder={form.previewPanelBorder}
              isActive={activeGlassFormId === form.id && previewKind !== "glass"}
              isPending={pendingGlassFormId === form.id && previewKind === "glass"}
              onClick={() => onPreviewGlassForm(form.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-black text-cyan-300 mb-2">
          🪟 سمات زجاجية (ألوان ووجه الشات)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {FACE_PRESETS.map((preset) => {
            const meta = GLASS_FACE_TEMPLATE_META[preset.id] ?? {
              subtitle: preset.name,
              previewGradient: `linear-gradient(145deg, ${preset.face.primary}, ${preset.face.accent})`,
            };
            return (
              <GlassDesignCard
                key={preset.id}
                emoji={preset.emoji}
                title={preset.name}
                subtitle={meta.subtitle}
                previewGradient={meta.previewGradient}
                isActive={activeFacePresetId === preset.id && previewKind !== "face"}
                isPending={pendingFacePresetId === preset.id && previewKind === "face"}
                onClick={() => onPreviewFacePreset(preset.id)}
              />
            );
          })}
        </div>
      </div>

      {applyDesignPreset && handleSaveDesignPreset && setDesignPresetName && (
        <div className="rounded-2xl p-4 space-y-3 lamma-section-card">
          <div className="text-[11px] font-black text-amber-300">
            💾 تصاميمك المحفوظة
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={designPresetName}
              onChange={(e) => setDesignPresetName(e.target.value)}
              placeholder="اسم الستايل الحالي..."
              className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white focus:outline-none lamma-input-shell"
            />
            <button
              type="button"
              onClick={handleSaveDesignPreset}
              onPointerDown={stopDrag}
              className="px-4 py-2 rounded-xl text-[10px] font-black lamma-accent-btn whitespace-nowrap"
            >
              حفظ
            </button>
          </div>
          {designPresets.length === 0 ? (
            <div className="text-[10px] text-gray-500 font-bold text-center py-3">
              مفيش تصاميم محفوظة — احفظ الشكل الحالي الأول
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {designPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="relative rounded-2xl border border-white/10 overflow-hidden lamma-admin-card group"
                >
                  <div
                    className="h-12 w-full"
                    style={{
                      background: preset.snapshot.ownerBgImage
                        ? `url(${preset.snapshot.ownerBgImage}) center/cover`
                        : "linear-gradient(145deg, #060a12, #10b981)",
                    }}
                  />
                  <div className="p-2.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => applyDesignPreset(preset)}
                      onPointerDown={stopDrag}
                      className="flex-1 text-right min-w-0"
                    >
                      <div className="text-[10px] font-black text-white truncate flex items-center gap-1">
                        <Check size={10} className="text-emerald-400 shrink-0" />
                        {preset.name}
                      </div>
                    </button>
                    {handleDeleteDesignPreset && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDesignPreset(preset.id)}
                        onPointerDown={stopDrag}
                        className="shrink-0 px-1.5 py-1 rounded-lg text-[9px] font-black text-red-300 hover:bg-red-500/15"
                        aria-label="حذف"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
