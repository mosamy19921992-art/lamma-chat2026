import type { DesignImportPack } from "./designImportCatalog";
import {
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from "./universalStyleTypes";

/** Frozen palette + effects per pack — preview replaces colors, does not tint over committed theme. */
export interface PackStyleSnapshot {
  themeId: string;
  label: string;
  palette: UniversalStyleConfig["palette"];
  glass?: Partial<UniversalStyleConfig["glass"]>;
  buttons?: Partial<UniversalStyleConfig["buttons"]>;
  inputs?: Partial<UniversalStyleConfig["inputs"]>;
  effects?: Partial<UniversalStyleConfig["effects"]>;
}

export const PACK_STYLE_SNAPSHOTS: Record<string, PackStyleSnapshot> = {
  "ios-liquid-glass": {
    themeId: "ios-liquid",
    label: "Liquid Glass iOS",
    palette: {
      bg: "#0a1628",
      surface: "rgba(22, 30, 48, 0.65)",
      accent: "#818cf8",
      accent2: "#c4b5fd",
      text: "#f1f5f9",
      muted: "#94a3b8",
    },
    glass: { blurPx: 28, opacity: 0.14, borderOpacity: 0.22 },
    buttons: { radiusPx: 20, glow: true, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "glass-minimal" },
  },
  "ios-vibrancy-dark": {
    themeId: "ios-vibrancy-dark",
    label: "Vibrancy داكن",
    palette: {
      bg: "#030712",
      surface: "rgba(15, 23, 42, 0.72)",
      accent: "#64748b",
      accent2: "#94a3b8",
      text: "#f8fafc",
      muted: "#64748b",
    },
    glass: { blurPx: 32, opacity: 0.1, borderOpacity: 0.16 },
    buttons: { radiusPx: 16, glow: false, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "none" },
  },
  "ios-widget-light": {
    themeId: "ios-widget-light",
    label: "Widget فاتح",
    palette: {
      bg: "#f1f5f9",
      surface: "rgba(255, 255, 255, 0.82)",
      accent: "#6366f1",
      accent2: "#818cf8",
      text: "#0f172a",
      muted: "#64748b",
    },
    glass: { blurPx: 20, opacity: 0.35, borderOpacity: 0.28 },
    buttons: { radiusPx: 22, glow: false, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "none" },
  },
  "glass-crystal-luxury": {
    themeId: "crystal-luxury",
    label: "كريستال فاخر",
    palette: {
      bg: "#1a1208",
      surface: "rgba(30, 22, 10, 0.78)",
      accent: "#fbbf24",
      accent2: "#f59e0b",
      text: "#fef3c7",
      muted: "#d4a63a",
    },
    glass: { blurPx: 24, opacity: 0.18, borderOpacity: 0.35 },
    buttons: { radiusPx: 14, glow: true, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "luxe-gold" },
  },
  "glass-frosted-ocean": {
    themeId: "frosted-ocean",
    label: "Frosted محيط",
    palette: {
      bg: "#060d18",
      surface: "rgba(8, 28, 48, 0.72)",
      accent: "#0ea5e9",
      accent2: "#38bdf8",
      text: "#e0f2fe",
      muted: "#7dd3fc",
    },
    glass: { blurPx: 26, opacity: 0.12, borderOpacity: 0.2 },
    buttons: { radiusPx: 16, glow: false, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "flow-strip" },
  },
  "columns-neon-focus": {
    themeId: "neon-focus",
    label: "أعمدة نيون",
    palette: {
      bg: "#041016",
      surface: "rgba(10, 20, 28, 0.82)",
      accent: "#10b981",
      accent2: "#6ee7b7",
      text: "#ecfdf5",
      muted: "#6ee7b7",
    },
    buttons: { radiusPx: 14, glow: true, neon: true },
    effects: {
      sidebarCardChase: false,
      sidebarChaseSpeedSec: 5,
      sidebarChaseTint: "#10b981",
      sidebarChaseOuterOnly: true,
    },
  },
  "columns-liquid-ring": {
    themeId: "liquid-ring",
    label: "Liquid Ring",
    palette: {
      bg: "#0f0a1a",
      surface: "rgba(24, 16, 40, 0.78)",
      accent: "#a855f7",
      accent2: "#ec4899",
      text: "#faf5ff",
      muted: "#c084fc",
    },
    glass: { blurPx: 22, opacity: 0.14, borderOpacity: 0.24 },
    effects: { sidebarCardChase: false },
  },
  "decor-geometric-tech": {
    themeId: "geometric-tech",
    label: "هندسي تقني",
    palette: {
      bg: "#0a0f16",
      surface: "rgba(14, 22, 32, 0.85)",
      accent: "#14b8a6",
      accent2: "#2dd4bf",
      text: "#ccfbf1",
      muted: "#5eead4",
    },
    buttons: { radiusPx: 8, glow: false, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "none" },
  },
  "theme-cyber-neon": {
    themeId: "cyber-neon",
    label: "Cyber Neon",
    palette: {
      bg: "#0a0014",
      surface: "rgba(20, 0, 40, 0.82)",
      accent: "#ff00ff",
      accent2: "#00ffff",
      text: "#fdf4ff",
      muted: "#e879f9",
    },
    glass: { blurPx: 18, opacity: 0.16, borderOpacity: 0.3 },
    buttons: { radiusPx: 12, glow: true, neon: true },
    effects: {
      sidebarCardChase: false,
      sidebarChaseSpeedSec: 4,
      sidebarChaseTint: "#22d3ee",
      sidebarChaseOuterOnly: true,
    },
  },
  "theme-emerald-lamma": {
    themeId: "emerald-lamma",
    label: "لمة Emerald",
    palette: {
      bg: "#060a12",
      surface: "rgba(18, 24, 32, 0.72)",
      accent: "#10b981",
      accent2: "#06b6d4",
      text: "#f8fafc",
      muted: "#94a3b8",
    },
    glass: { blurPx: 18, opacity: 0.12, borderOpacity: 0.1 },
    buttons: { radiusPx: 14, glow: false, neon: false },
    effects: { sidebarCardChase: false, chatHeaderStyle: "none" },
  },
  "colors-midnight-blue": {
    themeId: "midnight-blue",
    label: "منتصف الليل",
    palette: {
      bg: "#0c1222",
      surface: "rgba(18, 28, 52, 0.78)",
      accent: "#3b82f6",
      accent2: "#60a5fa",
      text: "#eff6ff",
      muted: "#93c5fd",
    },
    buttons: { radiusPx: 14, glow: false, neon: false },
  },
  "colors-rose-blush": {
    themeId: "rose-blush",
    label: "وردي ناعم",
    palette: {
      bg: "#1a0a12",
      surface: "rgba(40, 16, 28, 0.75)",
      accent: "#f472b6",
      accent2: "#fb7185",
      text: "#fff1f2",
      muted: "#fda4af",
    },
    buttons: { radiusPx: 18, glow: true, neon: false },
  },
  "colors-amber-warm": {
    themeId: "amber-warm",
    label: "دفء عنبري",
    palette: {
      bg: "#1c1208",
      surface: "rgba(40, 28, 12, 0.78)",
      accent: "#f59e0b",
      accent2: "#fbbf24",
      text: "#fffbeb",
      muted: "#fcd34d",
    },
    buttons: { radiusPx: 16, glow: false, neon: false },
  },
  "uiverse-neon-glow": {
    themeId: "ui-neon-glow",
    label: "UIverse Neon",
    palette: {
      bg: "#050508",
      surface: "rgba(12, 12, 24, 0.88)",
      accent: "#00f5ff",
      accent2: "#ff00aa",
      text: "#f0fdff",
      muted: "#67e8f9",
    },
    glass: { blurPx: 14, opacity: 0.2, borderOpacity: 0.45 },
    buttons: { radiusPx: 10, glow: true, neon: true },
    effects: { sidebarCardChase: false },
  },
  "uiverse-gradient-sunset": {
    themeId: "ui-sunset",
    label: "Gradient Sunset",
    palette: {
      bg: "#1a0f1e",
      surface: "rgba(40, 20, 36, 0.8)",
      accent: "#f97316",
      accent2: "#ec4899",
      text: "#fff7ed",
      muted: "#fdba74",
    },
    buttons: { radiusPx: 999, glow: true, neon: false },
    effects: { sidebarCardChase: false },
  },
  "uiverse-glass-morph": {
    themeId: "ui-glass-morph",
    label: "Glass Morph",
    palette: {
      bg: "#0f172a",
      surface: "rgba(255, 255, 255, 0.08)",
      accent: "#8b5cf6",
      accent2: "#a78bfa",
      text: "#f5f3ff",
      muted: "#c4b5fd",
    },
    glass: { blurPx: 30, opacity: 0.1, borderOpacity: 0.25 },
    buttons: { radiusPx: 20, glow: false, neon: false },
    effects: { sidebarCardChase: false },
  },
  "uiverse-morph-dark": {
    themeId: "ui-morph-dark",
    label: "Morph Dark",
    palette: {
      bg: "#09090b",
      surface: "rgba(24, 24, 27, 0.92)",
      accent: "#a855f7",
      accent2: "#6366f1",
      text: "#fafafa",
      muted: "#a1a1aa",
    },
    buttons: { radiusPx: 14, glow: true, neon: false },
    effects: { sidebarCardChase: false },
  },
};

export function buildPackStyleConfig(pack: DesignImportPack): UniversalStyleConfig {
  const snap = PACK_STYLE_SNAPSHOTS[pack.id];
  if (snap) {
    const base = createDefaultUniversalStyle();
    const merged: UniversalStyleConfig = {
      ...base,
      themeId: snap.themeId,
      label: snap.label,
      palette: { ...snap.palette },
      glass: { ...base.glass, ...snap.glass },
      buttons: { ...base.buttons, ...snap.buttons },
      inputs: { ...base.inputs, ...snap.inputs },
      effects: {
        ...base.effects,
        ...snap.effects,
      },
      promptHistory: [`pack:${pack.id}`],
    };
    if (
      pack.columnCardStyleId &&
      pack.columnCardStyleId !== "neon-ring" &&
      merged.effects.sidebarCardChase
    ) {
      merged.effects.sidebarCardChase = false;
    }
    return normalizeUniversalStyleConfig(merged);
  }
  return createDefaultUniversalStyle();
}
