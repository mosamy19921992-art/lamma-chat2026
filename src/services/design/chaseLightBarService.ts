import { loadGlassFormTint, DEFAULT_GLASS_TINT } from "./glassTransparencyService";
import { setDesignPreviewActive } from "./designPreviewDom";

export type ChaseLightStyleId =
  | "none"
  | "conic-spin"
  | "liquid-flow"
  | "pulse-glow"
  | "segment-dash"
  | "rainbow-wave"
  | "neon-double";

export type ChaseLightTarget = "columns" | "composer" | "header";

export interface ChaseLightPreset {
  id: ChaseLightStyleId;
  title: string;
  subtitle: string;
  emoji: string;
}

export const CHASE_LIGHT_PRESETS: ChaseLightPreset[] = [
  { id: "none", title: "بدون", subtitle: "إيقاف شريط النور", emoji: "⬜" },
  { id: "conic-spin", title: "Conic Spin", subtitle: "حلقة ملونة دوّارة", emoji: "🌈" },
  { id: "liquid-flow", title: "Liquid Flow", subtitle: "تدرج سائل متحرك", emoji: "💧" },
  { id: "pulse-glow", title: "Pulse Glow", subtitle: "توهج نابض", emoji: "💫" },
  { id: "segment-dash", title: "Segment Dash", subtitle: "شرط متقطع", emoji: "⚡" },
  { id: "rainbow-wave", title: "Rainbow Wave", subtitle: "موجة ألوان", emoji: "🎨" },
  { id: "neon-double", title: "Neon Double", subtitle: "حلقتان نيون", emoji: "💠" },
];

export interface ChaseLightSettings {
  columns: ChaseLightStyleId;
  composer: ChaseLightStyleId;
  header: ChaseLightStyleId;
  tintHex: string;
  speedSec: number;
}

const STORAGE_KEY = "lamma_chase_light_settings";
const ROOT_SELECTOR = ".lamma-neutral-glass";

const DEFAULT_SETTINGS: ChaseLightSettings = {
  // Default to no decorative lights — they were always-on and looked messy.
  // Owners can still enable any chase style from the design library.
  columns: "none",
  composer: "none",
  header: "none",
  tintHex: DEFAULT_GLASS_TINT,
  speedSec: 6,
};

let previewSnapshot: ChaseLightSettings | null = null;
let pendingPreview: Partial<ChaseLightSettings> | null = null;

function getRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(ROOT_SELECTOR) as HTMLElement | null;
}

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "110, 231, 183";
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

function normalizeSettings(raw: Partial<ChaseLightSettings> | null): ChaseLightSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw) return base;
  const valid = (id: unknown): id is ChaseLightStyleId =>
    CHASE_LIGHT_PRESETS.some((p) => p.id === id);
  return {
    columns: valid(raw.columns) ? raw.columns : base.columns,
    composer: valid(raw.composer) ? raw.composer : base.composer,
    header: valid(raw.header) ? raw.header : base.header,
    tintHex:
      raw.tintHex && /^#[0-9a-fA-F]{6}$/.test(raw.tintHex)
        ? raw.tintHex
        : base.tintHex,
    speedSec:
      typeof raw.speedSec === "number"
        ? Math.max(2, Math.min(16, raw.speedSec))
        : base.speedSec,
  };
}

export function loadChaseLightSettings(): ChaseLightSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw) as Partial<ChaseLightSettings>);
  } catch {
    // ignore
  }
  return {
    ...DEFAULT_SETTINGS,
    tintHex: loadGlassFormTint() || DEFAULT_SETTINGS.tintHex,
  };
}

function applySettingsToDom(settings: ChaseLightSettings, preview: boolean): boolean {
  const root = getRoot();
  if (!root) return false;

  root.setAttribute("data-chase-columns", settings.columns);
  root.setAttribute("data-chase-composer", settings.composer);
  root.setAttribute("data-chase-header", settings.header);
  root.style.setProperty("--chase-tint", settings.tintHex);
  root.style.setProperty("--chase-tint-rgb", hexToRgbTriplet(settings.tintHex));
  root.style.setProperty("--chase-speed", `${settings.speedSec}s`);

  if (preview) {
    root.setAttribute("data-chase-light-preview", "true");
    setDesignPreviewActive(true);
  } else {
    root.removeAttribute("data-chase-light-preview");
  }
  return true;
}

function persistSettings(settings: ChaseLightSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getChaseLightLabel(id: ChaseLightStyleId): string {
  return CHASE_LIGHT_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function previewChaseLightPatch(
  patch: Partial<ChaseLightSettings>,
): boolean {
  if (!previewSnapshot) {
    previewSnapshot = loadChaseLightSettings();
  }
  pendingPreview = { ...(pendingPreview ?? loadChaseLightSettings()), ...patch };
  return applySettingsToDom(normalizeSettings(pendingPreview), true);
}

export function previewChaseLightForTarget(
  target: ChaseLightTarget,
  styleId: ChaseLightStyleId,
): boolean {
  return previewChaseLightPatch({ [target]: styleId });
}

export function commitChaseLightSettings(settings?: ChaseLightSettings): boolean {
  const final = normalizeSettings(settings ?? pendingPreview ?? loadChaseLightSettings());
  const ok = applySettingsToDom(final, false);
  if (!ok) return false;
  persistSettings(final);
  previewSnapshot = null;
  pendingPreview = null;
  return true;
}

export function cancelChaseLightPreview(): boolean {
  const restore = previewSnapshot ?? loadChaseLightSettings();
  previewSnapshot = null;
  pendingPreview = null;
  return applySettingsToDom(restore, false);
}

export function ensureChaseLightApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(STORAGE_KEY)) return;
  } catch {
    return;
  }
  const ok = applySettingsToDom(loadChaseLightSettings(), false);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureChaseLightApplied(attempt + 1));
  }
}

export function updateChaseLightTintPreview(tintHex: string): void {
  previewChaseLightPatch({ tintHex });
}
