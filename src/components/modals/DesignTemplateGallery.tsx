import React from "react";
import { Check, Sparkles } from "lucide-react";
import type { DesignAssistantProposalId, DesignPreset } from "../../lib/chatTypes";
import { FACE_PRESETS } from "../../lib/customFace";
import {
  GLASS_FACE_TEMPLATE_META,
  READY_DESIGN_TEMPLATES,
} from "../../services/design/designReadyTemplates";

interface DesignTemplateGalleryProps {
  onApplyTemplate: (id: DesignAssistantProposalId) => void;
  onApplyFacePreset: (presetId: string) => void;
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
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  previewGradient: string;
  badge?: string;
  tags?: string[];
  isRecommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/10 text-right transition-all duration-200 hover:border-emerald-400/45 hover:shadow-[0_8px_32px_rgba(45,212,191,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
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
            تطبيق ←
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

export function DesignTemplateGallery({
  onApplyTemplate,
  onApplyFacePreset,
  recommendedPresetId,
  designPresets = [],
  applyDesignPreset,
  handleDeleteDesignPreset,
  designPresetName = "",
  setDesignPresetName,
  handleSaveDesignPreset,
}: DesignTemplateGalleryProps) {
  const stopDrag = (event: React.PointerEvent) => event.stopPropagation();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-3 lamma-admin-card border border-emerald-500/15">
        <div className="text-[10px] text-gray-300 font-bold leading-relaxed">
          اختار بطاقة جاهزة — كل بطاقة تطبّق ألوان وتقسيم وخلفيات بضغطة واحدة
          (بعد تأكيدك).
        </div>
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
              onClick={() => onApplyTemplate(template.id)}
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
                onClick={() => onApplyFacePreset(preset.id)}
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
