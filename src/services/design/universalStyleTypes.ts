/** Universal Visual AI Style Engine — shared types */

export type StyleBackgroundKind = "color" | "image" | "video";

export interface StyleBackgroundLayer {
  kind: StyleBackgroundKind;
  value: string;
  overlayOpacity: number;
  blurPx: number;
}

import type {
  ChatDesignRegion,
  RegionStyleState,
} from "./chatDesignVocabulary";
import type { DesignImportPack } from "./designImportCatalog";
import { createDefaultRegions } from "./chatDesignVocabulary";

export type ChatHeaderStyleId = "none" | "flow-strip" | "glass-minimal" | "luxe-gold";

import type { DesignOverlaysBundle } from "./designOverlayBundle";

export interface UniversalStyleConfig {
  version: 1;
  themeId: string;
  label: string;
  promptHistory: string[];
  palette: {
    bg: string;
    surface: string;
    accent: string;
    accent2: string;
    text: string;
    muted: string;
  };
  glass: {
    blurPx: number;
    opacity: number;
    borderOpacity: number;
  };
  buttons: {
    radiusPx: number;
    glow: boolean;
    neon: boolean;
  };
  inputs: {
    radiusPx: number;
    borderOpacity: number;
  };
  backgrounds: {
    global: StyleBackgroundLayer;
    feed: StyleBackgroundLayer;
    sidebar: StyleBackgroundLayer;
  };
  effects: {
    /** Rotating conic-gradient border on sidebar column cards (.lamma-glass) */
    sidebarCardChase: boolean;
    sidebarChaseSpeedSec: number;
    sidebarChaseTint: string;
    /** Border glow outside card only — no inner reflection */
    sidebarChaseOuterOnly: boolean;
    chatHeaderStyle: ChatHeaderStyleId;
    chatHeaderBlurPx: number;
  };
  /** Per-region styling — owner design bot vocabulary targets */
  regions: Record<ChatDesignRegion, RegionStyleState>;
  /** Sidebar widgets, chase lights, glass form, custom face — synced for all browsers */
  overlays?: DesignOverlaysBundle;
}

export interface StyleEngineParseResult {
  config: UniversalStyleConfig;
  summary: string;
  refined: boolean;
  /** When owner triggers a design import pack from chat */
  importPack?: DesignImportPack;
}

export interface StyleSandboxSession {
  id: string;
  createdAt: number;
  prompt: string;
  summary: string;
  config: UniversalStyleConfig;
  applied: boolean;
}

export const UNIVERSAL_STYLE_STORAGE_KEY = "lamma_universal_style_config";
export const UNIVERSAL_STYLE_SAVED_AT_KEY = "lamma_universal_style_saved_at";

export function createDefaultUniversalStyle(): UniversalStyleConfig {
  return {
    version: 1,
    themeId: "lamma-default",
    label: "الستايل الافتراضي",
    promptHistory: [],
    palette: {
      bg: "#060a12",
      surface: "rgba(18, 24, 32, 0.72)",
      accent: "#10b981",
      accent2: "#06b6d4",
      text: "#f8fafc",
      muted: "#94a3b8",
    },
    glass: {
      blurPx: 18,
      opacity: 0.12,
      borderOpacity: 0.1,
    },
    buttons: {
      radiusPx: 14,
      glow: false,
      neon: false,
    },
    inputs: {
      radiusPx: 16,
      borderOpacity: 0.12,
    },
    backgrounds: {
      global: { kind: "color", value: "#060a12", overlayOpacity: 0, blurPx: 0 },
      feed: { kind: "color", value: "transparent", overlayOpacity: 0, blurPx: 0 },
      sidebar: { kind: "color", value: "transparent", overlayOpacity: 0, blurPx: 0 },
    },
    effects: {
      sidebarCardChase: false,
      sidebarChaseSpeedSec: 6,
      sidebarChaseTint: "#10b981",
      sidebarChaseOuterOnly: false,
      chatHeaderStyle: "none",
      chatHeaderBlurPx: 22,
    },
    regions: createDefaultRegions(),
  };
}

function parseHexLuminance(color: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match?.[1]) return null;
  let raw = match[1];
  if (raw.length === 3) {
    raw = raw
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function paletteBgLuminance(bg: string): number {
  return parseHexLuminance(bg) ?? 0.06;
}

function paletteContrast(text: string, bg: string): number {
  const textLum = parseHexLuminance(text);
  const bgLum = paletteBgLuminance(bg);
  if (textLum === null) return 21;
  const brightest = Math.max(textLum, bgLum);
  const darkest = Math.min(textLum, bgLum);
  return (brightest + 0.05) / (darkest + 0.05);
}

/** Auto-fix unreadable text (e.g. #000 on dark bg) — WCAG AA 4.5:1 vs background. */
export function ensureReadablePalette(
  palette: UniversalStyleConfig["palette"],
): UniversalStyleConfig["palette"] {
  const text = /^#[0-9a-f]{6}$/i.test(palette.text.trim())
    ? palette.text.trim()
    : "#f8fafc";
  if (paletteContrast(text, palette.bg) >= 4.5) {
    return { ...palette, text };
  }
  const bgLum = paletteBgLuminance(palette.bg);
  return {
    ...palette,
    text: bgLum > 0.45 ? "#0f172a" : "#f8fafc",
  };
}

/** Merge persisted configs that predate `effects`. */
export function normalizeUniversalStyleConfig(
  raw: UniversalStyleConfig | null | undefined,
): UniversalStyleConfig {
  const base = createDefaultUniversalStyle();
  if (!raw || raw.version !== 1) return base;
  const mergedPalette = { ...base.palette, ...raw.palette };
  return {
    ...base,
    ...raw,
    palette: ensureReadablePalette(mergedPalette),
    glass: { ...base.glass, ...raw.glass },
    buttons: { ...base.buttons, ...raw.buttons },
    inputs: { ...base.inputs, ...raw.inputs },
    backgrounds: {
      global: { ...base.backgrounds.global, ...raw.backgrounds?.global },
      feed: { ...base.backgrounds.feed, ...raw.backgrounds?.feed },
      sidebar: { ...base.backgrounds.sidebar, ...raw.backgrounds?.sidebar },
    },
    effects: { ...base.effects, ...raw.effects },
    regions: mergeRegions(base.regions, raw.regions),
    promptHistory: raw.promptHistory || [],
  };
}

function mergeRegions(
  base: Record<ChatDesignRegion, RegionStyleState>,
  raw?: Partial<Record<ChatDesignRegion, Partial<RegionStyleState>>>,
): Record<ChatDesignRegion, RegionStyleState> {
  if (!raw) return base;
  const next = { ...base };
  for (const key of Object.keys(raw) as ChatDesignRegion[]) {
    next[key] = { ...base[key], ...raw[key] };
  }
  return next;
}
