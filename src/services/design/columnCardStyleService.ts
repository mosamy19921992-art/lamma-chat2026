import { loadGlassFormTint, DEFAULT_GLASS_TINT } from "./glassTransparencyService";
import { setDesignPreviewActive } from "./designPreviewDom";

export type ColumnCardStyleId =
  | "neon-ring"
  | "frosted"
  | "soft-round"
  | "pill"
  | "sharp"
  | "crystal"
  | "smoke"
  | "minimal";

export interface ColumnCardStylePreset {
  id: ColumnCardStyleId;
  title: string;
  subtitle: string;
  emoji: string;
  radiusPx: number;
  previewRadius: string;
  previewBg: string;
  previewBorder: string;
}

export const COLUMN_CARD_STYLE_PRESETS: ColumnCardStylePreset[] = [
  {
    id: "neon-ring",
    title: "حلقة نيون",
    subtitle: "الشكل الافتراضي — إطار ملون متحرك",
    emoji: "🌈",
    radiusPx: 24,
    previewRadius: "18px",
    previewBg: "rgba(14,11,7,0.92)",
    previewBorder: "linear-gradient(135deg,#ff2a5f,#10b981)",
  },
  {
    id: "frosted",
    title: "زجاج Frosted",
    subtitle: "شفافية + blur — يلتقط لون البطاقة",
    emoji: "🧊",
    radiusPx: 24,
    previewRadius: "18px",
    previewBg: "rgba(255,255,255,0.12)",
    previewBorder: "rgba(110,231,183,0.45)",
  },
  {
    id: "soft-round",
    title: "ناعم دائري",
    subtitle: "زوايا ناعمة ولمسة هادئة",
    emoji: "☁️",
    radiusPx: 32,
    previewRadius: "22px",
    previewBg: "rgba(255,255,255,0.1)",
    previewBorder: "rgba(255,255,255,0.22)",
  },
  {
    id: "pill",
    title: "كapsule",
    subtitle: "شكل كapsule — زوايا كاملة",
    emoji: "💊",
    radiusPx: 999,
    previewRadius: "999px",
    previewBg: "rgba(255,255,255,0.08)",
    previewBorder: "rgba(167,139,250,0.4)",
  },
  {
    id: "sharp",
    title: "حاد هندسي",
    subtitle: "زوايا حادة — طابع تقني",
    emoji: "◼️",
    radiusPx: 8,
    previewRadius: "6px",
    previewBg: "rgba(18,22,30,0.82)",
    previewBorder: "rgba(56,189,248,0.35)",
  },
  {
    id: "crystal",
    title: "كريستال",
    subtitle: "حدود بارزة + لمعان",
    emoji: "💎",
    radiusPx: 16,
    previewRadius: "14px",
    previewBg: "rgba(255,255,255,0.14)",
    previewBorder: "rgba(110,231,183,0.55)",
  },
  {
    id: "smoke",
    title: "دخان داكن",
    subtitle: "بطاقة داكنة دخانية فخمة",
    emoji: "🌫️",
    radiusPx: 20,
    previewRadius: "16px",
    previewBg: "rgba(8,12,18,0.78)",
    previewBorder: "rgba(255,255,255,0.12)",
  },
  {
    id: "minimal",
    title: "بسيط مسطح",
    subtitle: "بدون blur — خط وحد خفيف",
    emoji: "▫️",
    radiusPx: 12,
    previewRadius: "10px",
    previewBg: "rgba(255,255,255,0.04)",
    previewBorder: "rgba(255,255,255,0.14)",
  },
];

const STORAGE_KEY = "lamma_column_card_style";
const TINT_STORAGE_KEY = "lamma_column_card_tint";

let previewSnapshot: { styleId: ColumnCardStyleId | null; tintHex: string } | null =
  null;

function getChatRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(".lamma-neutral-glass");
}

function hexToRgbTriplet(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return "110, 231, 183";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "110, 231, 183";
  return `${r}, ${g}, ${b}`;
}

function getPreset(id: ColumnCardStyleId): ColumnCardStylePreset | undefined {
  return COLUMN_CARD_STYLE_PRESETS.find((p) => p.id === id);
}

function applyColumnCardStyleToDom(
  id: ColumnCardStyleId | null,
  tintHex: string,
  isPreview: boolean,
): boolean {
  const root = getChatRoot();
  if (!root) return false;

  if (!id || id === "neon-ring") {
    delete root.dataset.columnCardStyle;
    root.style.removeProperty("--cc-radius");
    root.style.removeProperty("--cc-tint-rgb");
    root.style.removeProperty("--cc-accent");
    if (isPreview) {
      root.dataset.columnCardPreview = "true";
    } else {
      delete root.dataset.columnCardPreview;
    }
  } else {
    const preset = getPreset(id);
    root.dataset.columnCardStyle = id;
    root.style.setProperty("--cc-radius", `${preset?.radiusPx ?? 24}px`);
    root.style.setProperty("--cc-tint-rgb", hexToRgbTriplet(tintHex));
    root.style.setProperty("--cc-accent", tintHex);
    root.dataset.columnCardPreview = isPreview ? "true" : "false";
  }

  if (isPreview) setDesignPreviewActive(true);
  else if (!root.dataset.glassForm && !root.dataset.glassPreview) {
    setDesignPreviewActive(false);
  }

  return true;
}

export function loadColumnCardTint(): string {
  if (typeof window === "undefined") return loadGlassFormTint();
  try {
    const raw = localStorage.getItem(TINT_STORAGE_KEY);
    if (raw && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  } catch {
    // ignore
  }
  return loadGlassFormTint() || DEFAULT_GLASS_TINT;
}

export function loadColumnCardStyleId(): ColumnCardStyleId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw === "neon-ring") return null;
    if (COLUMN_CARD_STYLE_PRESETS.some((p) => p.id === raw)) {
      return raw as ColumnCardStyleId;
    }
  } catch {
    // ignore
  }
  return null;
}

function persistColumnCardStyle(id: ColumnCardStyleId | null, tintHex: string): void {
  try {
    if (!id || id === "neon-ring") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
    localStorage.setItem(TINT_STORAGE_KEY, tintHex);
  } catch {
    // ignore
  }
}

export function previewColumnCardStyle(id: ColumnCardStyleId, tintHex: string): boolean {
  if (!previewSnapshot) {
    previewSnapshot = {
      styleId: loadColumnCardStyleId(),
      tintHex: loadColumnCardTint(),
    };
  }
  return applyColumnCardStyleToDom(id, tintHex, true);
}

export function commitColumnCardStyle(id: ColumnCardStyleId, tintHex: string): boolean {
  const ok = applyColumnCardStyleToDom(id, tintHex, false);
  if (!ok) return false;
  persistColumnCardStyle(id, tintHex);
  previewSnapshot = null;
  return true;
}

export function cancelColumnCardPreview(): boolean {
  const restore = previewSnapshot ?? {
    styleId: loadColumnCardStyleId(),
    tintHex: loadColumnCardTint(),
  };
  previewSnapshot = null;
  if (!restore.styleId || restore.styleId === "neon-ring") {
    const root = getChatRoot();
    if (root) {
      delete root.dataset.columnCardStyle;
      delete root.dataset.columnCardPreview;
      root.style.removeProperty("--cc-radius");
      root.style.removeProperty("--cc-tint-rgb");
      root.style.removeProperty("--cc-accent");
    }
    return true;
  }
  return applyColumnCardStyleToDom(restore.styleId, restore.tintHex, false);
}

export function ensureColumnCardStyleApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const id = loadColumnCardStyleId();
  const tint = loadColumnCardTint();
  const ok = id
    ? applyColumnCardStyleToDom(id, tint, false)
    : applyColumnCardStyleToDom(null, tint, false);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureColumnCardStyleApplied(attempt + 1));
  }
}

export function getColumnCardStyleLabel(id: ColumnCardStyleId | null): string {
  if (!id || id === "neon-ring") return "حلقة نيون (افتراضي)";
  return getPreset(id)?.title ?? id;
}

export function updateColumnCardTintPreview(tintHex: string): void {
  const root = getChatRoot();
  if (!root?.dataset.columnCardStyle) return;
  root.style.setProperty("--cc-tint-rgb", hexToRgbTriplet(tintHex));
  root.style.setProperty("--cc-accent", tintHex);
}
