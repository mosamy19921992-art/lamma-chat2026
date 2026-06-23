import React, { useState } from "react";
import {
  BUBBLE_SHAPE_PRESETS,
  commitBubbleShape,
  loadBubbleShapeId,
  type BubbleShapeId,
} from "../../services/design/bubbleShapeService";
import {
  PM_BUBBLE_STYLE_PRESETS,
  commitPmBubbleStyle,
  loadPmBubbleStyleId,
  type PmBubbleStyleId,
} from "../../services/design/pmBubbleStyleService";
import {
  RADIO_PANEL_PRESETS,
  MUSIC_PANEL_PRESETS,
  COLUMN_DIVIDER_PRESETS,
  commitSidebarWidgetSettings,
  loadSidebarWidgetSettings,
  type RadioPanelStyleId,
  type MusicPanelStyleId,
  type ColumnDividerStyleId,
} from "../../services/design/sidebarWidgetStyleService";
import {
  CHASE_LIGHT_PRESETS_2026,
  CHASE_LIGHT_PRESETS_LEGACY,
  commitChaseLightSettings,
  loadChaseLightSettings,
  type ChaseLightSettings,
  type ChaseLightStyleId,
  type ChaseLightTarget,
} from "../../services/design/chaseLightBarService";
import {
  COLUMN_CARD_STYLE_PRESETS,
  commitColumnCardStyle,
  loadColumnCardStyleId,
  loadColumnCardTint,
  type ColumnCardStyleId,
} from "../../services/design/columnCardStyleService";

function PresetGrid<T extends string>({
  presets,
  activeId,
  onSelect,
}: {
  presets: { id: T; title: string; emoji: string }[];
  activeId: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={`p-2 rounded-xl border text-center transition-all ${
            activeId === p.id
              ? "border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/40"
              : "border-white/10 bg-white/[0.04] hover:border-white/25"
          }`}
        >
          <div className="text-base">{p.emoji}</div>
          <div className="text-[7px] font-black text-white truncate">{p.title}</div>
        </button>
      ))}
    </div>
  );
}

function SectionBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-2xl lamma-section-card space-y-2">
      <div className="text-[11px] text-cyan-300 font-black">{title}</div>
      {hint ? (
        <div className="text-[9px] text-gray-400 font-bold leading-relaxed">{hint}</div>
      ) : null}
      {children}
    </div>
  );
}

interface DesignShapesPanelProps {
  onStartInspectMode?: () => void;
}

export function DesignShapesPanel({ onStartInspectMode }: DesignShapesPanelProps) {
  const [bubbleId, setBubbleId] = useState<BubbleShapeId>(() => loadBubbleShapeId());
  const [pmId, setPmId] = useState<PmBubbleStyleId>(() => loadPmBubbleStyleId());
  const [widgets, setWidgets] = useState(() => loadSidebarWidgetSettings());
  const [columnId, setColumnId] = useState<ColumnCardStyleId | null>(() =>
    loadColumnCardStyleId(),
  );
  const [chase, setChase] = useState<ChaseLightSettings>(() => loadChaseLightSettings());
  const [showLegacyChase, setShowLegacyChase] = useState(false);

  const applyBubble = (id: BubbleShapeId) => {
    if (commitBubbleShape(id)) setBubbleId(id);
    else alert("⚠️ افتح غرفة شات عادية (مش غرفة القيادة) لتطبيق شكل الفقاعات.");
  };

  const applyPm = (id: PmBubbleStyleId) => {
    if (commitPmBubbleStyle(id)) setPmId(id);
    else alert("⚠️ افتح غرفة شات لتطبيق شكل الخاص.");
  };

  const applyWidget = (patch: Partial<typeof widgets>) => {
    const next = { ...widgets, ...patch };
    if (commitSidebarWidgetSettings(next)) setWidgets(next);
    else alert("⚠️ افتح غرفة شات لتطبيق شكل الراديو/الموسيقى/الفاصل.");
  };

  const applyColumn = (id: ColumnCardStyleId) => {
    if (commitColumnCardStyle(id, loadColumnCardTint())) {
      setColumnId(id === "neon-ring" ? null : id);
    } else {
      alert("⚠️ افتح غرفة شات لتطبيق شكل البطاقات.");
    }
  };

  const applyChaseTarget = (target: ChaseLightTarget, styleId: ChaseLightStyleId) => {
    const next = { ...chase, [target]: styleId };
    setChase(next);
    if (commitChaseLightSettings(next)) {
      setChase(loadChaseLightSettings());
    }
  };

  const applyChaseAll = (styleId: ChaseLightStyleId) => {
    const next: ChaseLightSettings = {
      ...chase,
      columns: styleId,
      composer: styleId,
      header: styleId,
    };
    setChase(next);
    if (commitChaseLightSettings(next)) setChase(loadChaseLightSettings());
  };

  return (
    <div className="space-y-4" dir="rtl">
      {onStartInspectMode ? (
        <button
          type="button"
          onClick={() => onStartInspectMode()}
          className="w-full py-2.5 rounded-xl text-[10px] font-black lamma-accent-btn text-white"
        >
          🎯 Inspect — حدّد جزء في الشات وعدّله
        </button>
      ) : null}

      <SectionBlock title="💬 فقاعات الشات العام" hint="WhatsApp · iOS · Telegram">
        <PresetGrid presets={BUBBLE_SHAPE_PRESETS} activeId={bubbleId} onSelect={applyBubble} />
      </SectionBlock>

      <SectionBlock title="🔒 فورمات المحادثة الخاصة" hint="مستقل عن شكل الشات العام">
        <PresetGrid presets={PM_BUBBLE_STYLE_PRESETS} activeId={pmId} onSelect={applyPm} />
      </SectionBlock>

      <SectionBlock title="🎨 ألوان نص البطاقات" hint="متجر VIP · راديو · موسيقى — كل بطاقة لون مستقل">
        {(
          [
            ["storeText", "👑 المتجر / VIP", widgets.storeText],
            ["radioText", "📻 الراديو", widgets.radioText],
            ["musicText", "🎵 الموسيقى / DJ", widgets.musicText],
          ] as const
        ).map(([key, label, value]) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-black text-gray-300">{label}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={value}
                onChange={(e) => applyWidget({ [key]: e.target.value })}
                className="w-8 h-8 rounded-lg border border-white/15 cursor-pointer bg-transparent"
                aria-label={label}
              />
              <span className="text-[8px] font-mono text-gray-500 w-14">{value}</span>
            </div>
          </div>
        ))}
      </SectionBlock>

      <SectionBlock title="📻 شكل الراديو">
        <PresetGrid
          presets={RADIO_PANEL_PRESETS}
          activeId={widgets.radio}
          onSelect={(id) => applyWidget({ radio: id as RadioPanelStyleId })}
        />
      </SectionBlock>

      <SectionBlock title="🎵 شكل الموسيقى / DJ">
        <PresetGrid
          presets={MUSIC_PANEL_PRESETS}
          activeId={widgets.music}
          onSelect={(id) => applyWidget({ music: id as MusicPanelStyleId })}
        />
      </SectionBlock>

      <SectionBlock title="➖ فواصل العواميد" hint="بين VIP · راديو · موسيقى · غرف">
        <PresetGrid
          presets={COLUMN_DIVIDER_PRESETS}
          activeId={widgets.divider}
          onSelect={(id) => applyWidget({ divider: id as ColumnDividerStyleId })}
        />
      </SectionBlock>

      <SectionBlock title="🃏 بطاقات الأعمدة">
        <PresetGrid
          presets={COLUMN_CARD_STYLE_PRESETS.slice(0, 8)}
          activeId={columnId ?? "neon-ring"}
          onSelect={applyColumn}
        />
      </SectionBlock>

      <SectionBlock title="✨ أشرطة النور 2026" hint="أنظف — بدون رينبو افتراضياً">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CHASE_LIGHT_PRESETS_2026.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyChaseAll(p.id)}
              className={`px-2 py-1.5 rounded-lg text-[8px] font-black border transition-all ${
                chase.columns === p.id &&
                chase.composer === p.id &&
                chase.header === p.id
                  ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-200"
                  : "border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {p.emoji} {p.title}
            </button>
          ))}
        </div>
        <div className="text-[9px] text-gray-500 font-bold mb-1">أو لكل منطقة:</div>
        {(
          [
            ["columns", "🃏 الأعمدة"],
            ["composer", "⌨️ الكتابة"],
            ["header", "📌 الهيدر"],
          ] as const
        ).map(([target, label]) => (
          <div key={target} className="mb-2">
            <div className="text-[8px] font-black text-gray-400 mb-1">{label}</div>
            <div className="flex flex-wrap gap-1">
              {CHASE_LIGHT_PRESETS_2026.map((p) => (
                <button
                  key={`${target}-${p.id}`}
                  type="button"
                  onClick={() => applyChaseTarget(target, p.id)}
                  className={`px-1.5 py-1 rounded-md text-[7px] font-black border ${
                    chase[target] === p.id
                      ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                      : "border-white/10 text-gray-500"
                  }`}
                >
                  {p.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setShowLegacyChase((v) => !v)}
          className="text-[8px] text-gray-500 font-bold underline"
        >
          {showLegacyChase ? "إخفاء الأنماط القديمة" : "متقدّم — أنماط رينبو قديمة"}
        </button>
        {showLegacyChase ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {CHASE_LIGHT_PRESETS_LEGACY.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyChaseAll(p.id)}
                className="px-1.5 py-1 rounded-md text-[7px] font-black border border-white/10 text-gray-500"
              >
                {p.emoji} {p.title}
              </button>
            ))}
          </div>
        ) : null}
      </SectionBlock>
    </div>
  );
}
