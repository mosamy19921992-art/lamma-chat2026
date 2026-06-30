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
  disabled = false,
}: {
  presets: { id: T; title: string; emoji: string }[];
  activeId: T;
  onSelect: (id: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p.id)}
          className={`p-2 rounded-xl border text-center transition-all disabled:opacity-40 disabled:pointer-events-none ${
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
  isOwnerRole?: boolean;
}

export function DesignShapesPanel({ onStartInspectMode, isOwnerRole = false }: DesignShapesPanelProps) {
  const [bubbleId, setBubbleId] = useState<BubbleShapeId>(() => loadBubbleShapeId());
  const [pmId, setPmId] = useState<PmBubbleStyleId>(() => loadPmBubbleStyleId());
  const [widgets, setWidgets] = useState(() => loadSidebarWidgetSettings());
  const [columnId, setColumnId] = useState<ColumnCardStyleId | null>(() =>
    loadColumnCardStyleId(),
  );
  const applyBubble = (id: BubbleShapeId) => {
    if (!isOwnerRole) return;
    if (commitBubbleShape(id)) setBubbleId(id);
    else alert("⚠️ افتح غرفة شات عادية (مش غرفة القيادة) لتطبيق شكل الفقاعات.");
  };

  const applyPm = (id: PmBubbleStyleId) => {
    if (!isOwnerRole) return;
    if (commitPmBubbleStyle(id)) setPmId(id);
    else alert("⚠️ افتح غرفة شات لتطبيق شكل الخاص.");
  };

  const applyWidget = (patch: Partial<typeof widgets>) => {
    if (!isOwnerRole) return;
    const next = { ...widgets, ...patch };
    if (commitSidebarWidgetSettings(next)) setWidgets(next);
    else alert("⚠️ افتح غرفة شات لتطبيق شكل الراديو/الموسيقى/الفاصل.");
  };

  const applyColumn = (id: ColumnCardStyleId) => {
    if (!isOwnerRole) return;
    if (commitColumnCardStyle(id, loadColumnCardTint())) {
      setColumnId(id === "neon-ring" ? null : id);
    } else {
      alert("⚠️ افتح غرفة شات لتطبيق شكل البطاقات.");
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {!isOwnerRole && (
        <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-[10px] text-amber-300 font-black text-center">
          👑 تعديل الأشكال للمالك بس — المعاينة متاحة للجميع
        </div>
      )}
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
        <PresetGrid presets={BUBBLE_SHAPE_PRESETS} activeId={bubbleId} onSelect={applyBubble} disabled={!isOwnerRole} />
      </SectionBlock>

      <SectionBlock title="🔒 فورمات المحادثة الخاصة" hint="مستقل عن شكل الشات العام">
        <PresetGrid presets={PM_BUBBLE_STYLE_PRESETS} activeId={pmId} onSelect={applyPm} disabled={!isOwnerRole} />
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
                disabled={!isOwnerRole}
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
          disabled={!isOwnerRole}
        />
      </SectionBlock>

      <SectionBlock title="🎵 شكل الموسيقى / DJ">
        <PresetGrid
          presets={MUSIC_PANEL_PRESETS}
          activeId={widgets.music}
          onSelect={(id) => applyWidget({ music: id as MusicPanelStyleId })}
          disabled={!isOwnerRole}
        />
      </SectionBlock>

      <SectionBlock title="➖ فواصل العواميد" hint="بين VIP · راديو · موسيقى · غرف">
        <PresetGrid
          presets={COLUMN_DIVIDER_PRESETS}
          activeId={widgets.divider}
          onSelect={(id) => applyWidget({ divider: id as ColumnDividerStyleId })}
          disabled={!isOwnerRole}
        />
      </SectionBlock>

      <SectionBlock title="🃏 بطاقات الأعمدة">
        <PresetGrid
          presets={COLUMN_CARD_STYLE_PRESETS}
          activeId={columnId ?? "neon-ring"}
          onSelect={applyColumn}
          disabled={!isOwnerRole}
        />
      </SectionBlock>
    </div>
  );
}
