export type GlassFormId =
  | "classic"
  | "ultra-clear"
  | "soft-read"
  | "solid-focus"
  | "mirror"
  | "smoke-dark"
  | "crystal"
  | "ghost"
  | "ios-vibrancy"
  | "ios-liquid"
  | "ios-widget"
  | "fully-transparent"
  | "background-reveal";

export interface GlassFormPreset {
  id: GlassFormId;
  title: string;
  subtitle: string;
  emoji: string;
  blurLabel: string;
  previewPanelBg: string;
  previewPanelBlur: string;
  previewPanelBorder: string;
  previewBackdrop: string;
}

export const GLASS_FORM_PRESETS: GlassFormPreset[] = [
  {
    id: "classic",
    title: "زجاج كلاسيك",
    subtitle: "توازن iOS — الشكل الافتراضي الأنيق",
    emoji: "🪟",
    blurLabel: "28px",
    previewPanelBg: "rgba(255,255,255,0.1)",
    previewPanelBlur: "blur(14px)",
    previewPanelBorder: "rgba(255,255,255,0.22)",
    previewBackdrop: "linear-gradient(145deg, #0a1628, #1e3a5f)",
  },
  {
    id: "ultra-clear",
    title: "شفافية فائقة",
    subtitle: "زجاج شبه مخفي — blur قوي",
    emoji: "💎",
    blurLabel: "44px",
    previewPanelBg: "rgba(255,255,255,0.07)",
    previewPanelBlur: "blur(20px)",
    previewPanelBorder: "rgba(255,255,255,0.3)",
    previewBackdrop: "linear-gradient(145deg, #041016, #0891b2)",
  },
  {
    id: "soft-read",
    title: "قراءة مريحة",
    subtitle: "أقل شفافية — أوضح للنص",
    emoji: "📖",
    blurLabel: "20px",
    previewPanelBg: "rgba(255,255,255,0.16)",
    previewPanelBlur: "blur(10px)",
    previewPanelBorder: "rgba(255,255,255,0.18)",
    previewBackdrop: "linear-gradient(145deg, #0f172a, #334155)",
  },
  {
    id: "solid-focus",
    title: "تركيز صلب",
    subtitle: "لوحات أوضح — forms واضحة",
    emoji: "📋",
    blurLabel: "12px",
    previewPanelBg: "rgba(18,22,30,0.82)",
    previewPanelBlur: "blur(6px)",
    previewPanelBorder: "rgba(255,255,255,0.14)",
    previewBackdrop: "linear-gradient(145deg, #111827, #374151)",
  },
  {
    id: "mirror",
    title: "مرآة لامعة",
    subtitle: "لمعة عالية وحواف بارزة",
    emoji: "✨",
    blurLabel: "36px",
    previewPanelBg:
      "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
    previewPanelBlur: "blur(16px)",
    previewPanelBorder: "rgba(255,255,255,0.38)",
    previewBackdrop: "linear-gradient(145deg, #1a1208, #d4a63a)",
  },
  {
    id: "smoke-dark",
    title: "دخان داكن",
    subtitle: "زجاج أسود دخاني — فخامة",
    emoji: "🌫️",
    blurLabel: "32px",
    previewPanelBg: "rgba(8,12,18,0.62)",
    previewPanelBlur: "blur(14px)",
    previewPanelBorder: "rgba(255,255,255,0.1)",
    previewBackdrop: "linear-gradient(145deg, #030712, #1f2937)",
  },
  {
    id: "crystal",
    title: "كريستال حاد",
    subtitle: "حدود واضحة وشفافية متوسطة",
    emoji: "🔷",
    blurLabel: "26px",
    previewPanelBg: "rgba(255,255,255,0.09)",
    previewPanelBlur: "blur(12px)",
    previewPanelBorder: "rgba(110,231,183,0.35)",
    previewBackdrop: "linear-gradient(145deg, #060a12, #14b8a6)",
  },
  {
    id: "ghost",
    title: "شبح شفاف",
    subtitle: "أخف form — خلفية باينة",
    emoji: "👻",
    blurLabel: "48px",
    previewPanelBg: "rgba(255,255,255,0.04)",
    previewPanelBlur: "blur(22px)",
    previewPanelBorder: "rgba(255,255,255,0.12)",
    previewBackdrop: "linear-gradient(145deg, #0a060f, #a855f7)",
  },
  {
    id: "ios-vibrancy",
    title: "iOS Vibrancy",
    subtitle: "blur عميق + تشبع — Control Center",
    emoji: "🌑",
    blurLabel: "52px",
    previewPanelBg: "rgba(255,255,255,0.06)",
    previewPanelBlur: "blur(24px)",
    previewPanelBorder: "rgba(255,255,255,0.16)",
    previewBackdrop: "linear-gradient(145deg, #030712, #334155)",
  },
  {
    id: "ios-liquid",
    title: "Liquid Glass",
    subtitle: "زجاج سائل iOS 18 — لمعة + depth",
    emoji: "🫧",
    blurLabel: "40px",
    previewPanelBg:
      "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))",
    previewPanelBlur: "blur(18px)",
    previewPanelBorder: "rgba(255,255,255,0.28)",
    previewBackdrop: "linear-gradient(145deg, #0a1628, #6366f1)",
  },
  {
    id: "ios-widget",
    title: "iOS Widget",
    subtitle: "بطاقات Home Screen — ناعمة فاتحة",
    emoji: "📱",
    blurLabel: "24px",
    previewPanelBg: "rgba(255,255,255,0.22)",
    previewPanelBlur: "blur(12px)",
    previewPanelBorder: "rgba(255,255,255,0.35)",
    previewBackdrop: "linear-gradient(145deg, #f1f5f9, #94a3b8)",
  },
  {
    id: "fully-transparent",
    title: "شفافية كاملة",
    subtitle: "بدون خلفية نهائياً — فقط حدود خفيفة",
    emoji: "🫧",
    blurLabel: "0px",
    previewPanelBg: "transparent",
    previewPanelBlur: "none",
    previewPanelBorder: "rgba(255,255,255,0.08)",
    previewBackdrop: "linear-gradient(145deg, #0a1628, #1e3a5f)",
  },
  {
    id: "background-reveal",
    title: "إظهار الخلفية 2026",
    subtitle: "بطاقات شفافة جداً — الخلفية باينة من وراها",
    emoji: "🖼️",
    blurLabel: "8px",
    previewPanelBg: "rgba(255,255,255,0.03)",
    previewPanelBlur: "blur(4px)",
    previewPanelBorder: "rgba(255,255,255,0.15)",
    previewBackdrop: "linear-gradient(145deg, #0a1628, #1e3a5f)",
  },
];

export const GLASS_TINT_SWATCHES = [
  "#6ee7b7",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#fbbf24",
  "#f87171",
  "#94a3b8",
  "#ffffff",
] as const;

export const DEFAULT_GLASS_TINT = "#6ee7b7";

import { setDesignPreviewActive } from "./designPreviewDom";
import { scheduleDesignOverlaysSync } from "./designOverlaySync";

const FORM_STORAGE_KEY = "lamma_glass_form";
const TINT_STORAGE_KEY = "lamma_glass_form_tint";

export interface GlassFormSavedState {
  formId: GlassFormId | null;
  tintHex: string;
}

let previewSnapshot: GlassFormSavedState | null = null;

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

const GF_VAR_KEYS = [
  "--gf-blur",
  "--gf-sat",
  "--gf-top",
  "--gf-bottom",
  "--gf-sheen",
  "--gf-column-radius",
] as const;

/** Per-preset glass tuning — makes presets visually distinct on chat columns. */
const GLASS_FORM_DOM_VARS: Record<
  GlassFormId,
  {
    blur: string;
    sat: string;
    top: string;
    bottom: string;
    sheen: string;
    columnRadius: string;
  }
> = {
  classic: { blur: "28px", sat: "1.3", top: "0.10", bottom: "0.82", sheen: "0.20", columnRadius: "24px" },
  "ultra-clear": { blur: "44px", sat: "1.55", top: "0.07", bottom: "0.78", sheen: "0.16", columnRadius: "24px" },
  "soft-read": { blur: "20px", sat: "1.2", top: "0.16", bottom: "0.88", sheen: "0.14", columnRadius: "22px" },
  "solid-focus": { blur: "12px", sat: "1.1", top: "0.22", bottom: "0.92", sheen: "0.10", columnRadius: "18px" },
  mirror: { blur: "36px", sat: "1.45", top: "0.22", bottom: "0.80", sheen: "0.28", columnRadius: "24px" },
  "smoke-dark": { blur: "32px", sat: "1.15", top: "0.06", bottom: "0.90", sheen: "0.08", columnRadius: "24px" },
  crystal: { blur: "26px", sat: "1.35", top: "0.09", bottom: "0.84", sheen: "0.18", columnRadius: "20px" },
  ghost: { blur: "48px", sat: "1.6", top: "0.04", bottom: "0.72", sheen: "0.12", columnRadius: "26px" },
  "ios-vibrancy": { blur: "52px", sat: "1.7", top: "0.06", bottom: "0.76", sheen: "0.15", columnRadius: "24px" },
  "ios-liquid": { blur: "40px", sat: "1.5", top: "0.18", bottom: "0.80", sheen: "0.24", columnRadius: "28px" },
  "ios-widget": { blur: "24px", sat: "1.25", top: "0.22", bottom: "0.86", sheen: "0.22", columnRadius: "20px" },
  "fully-transparent": { blur: "0px", sat: "1", top: "0", bottom: "0", sheen: "0", columnRadius: "24px" },
  "background-reveal": { blur: "8px", sat: "1.05", top: "0.03", bottom: "0.5", sheen: "0.06", columnRadius: "24px" },
};

function clearGlassFormVars(root: HTMLElement): void {
  GF_VAR_KEYS.forEach((key) => root.style.removeProperty(key));
}

function applyGlassFormVars(root: HTMLElement, id: GlassFormId): void {
  const vars = GLASS_FORM_DOM_VARS[id];
  if (!vars) return;
  root.style.setProperty("--gf-blur", vars.blur);
  root.style.setProperty("--gf-sat", vars.sat);
  root.style.setProperty("--gf-top", vars.top);
  root.style.setProperty("--gf-bottom", vars.bottom);
  root.style.setProperty("--gf-sheen", vars.sheen);
  root.style.setProperty("--gf-column-radius", vars.columnRadius);
}

function applyGlassFormToDom(
  id: GlassFormId | null,
  tintHex: string,
  isPreview: boolean,
): boolean {
  const root = getChatRoot();
  if (!root) return false;

  if (!id) {
    delete root.dataset.glassForm;
    delete root.dataset.glassPreview;
    root.style.removeProperty("--gf-custom-rgb");
    root.style.removeProperty("--gf-accent");
    clearGlassFormVars(root);
    if (!isPreview) setDesignPreviewActive(false);
  } else {
    root.dataset.glassForm = id;
    root.dataset.glassPreview = isPreview ? "true" : "false";
    root.style.setProperty("--gf-custom-rgb", hexToRgbTriplet(tintHex));
    root.style.setProperty("--gf-accent", tintHex);
    applyGlassFormVars(root, id);
    if (isPreview) setDesignPreviewActive(true);
    else {
      delete root.dataset.glassPreview;
      setDesignPreviewActive(false);
    }
  }

  return true;
}

export function loadGlassFormTint(): string {
  if (typeof window === "undefined") return DEFAULT_GLASS_TINT;
  try {
    const raw = localStorage.getItem(TINT_STORAGE_KEY);
    if (raw && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_GLASS_TINT;
}

export function loadGlassFormId(): GlassFormId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return null;
    if (GLASS_FORM_PRESETS.some((p) => p.id === raw)) {
      return raw as GlassFormId;
    }
  } catch {
    // ignore
  }
  return null;
}

export function loadGlassFormState(): GlassFormSavedState {
  return {
    formId: loadGlassFormId(),
    tintHex: loadGlassFormTint(),
  };
}

function persistGlassFormState(state: GlassFormSavedState): void {
  try {
    if (state.formId) {
      localStorage.setItem(FORM_STORAGE_KEY, state.formId);
    } else {
      localStorage.removeItem(FORM_STORAGE_KEY);
    }
    localStorage.setItem(TINT_STORAGE_KEY, state.tintHex);
  } catch {
    // ignore
  }
}

/** Live preview on chat — does not save until commit. */
export function previewGlassForm(id: GlassFormId, tintHex: string): boolean {
  if (!previewSnapshot) {
    previewSnapshot = loadGlassFormState();
  }
  return applyGlassFormToDom(id, tintHex, true);
}

/** Save and keep the previewed glass form + tint. */
export function commitGlassForm(
  id: GlassFormId,
  tintHex: string,
  options?: { skipSync?: boolean },
): boolean {
  const ok = applyGlassFormToDom(id, tintHex, false);
  if (!ok) return false;
  persistGlassFormState({ formId: id, tintHex });
  previewSnapshot = null;
  if (!options?.skipSync) scheduleDesignOverlaysSync();
  return true;
}

/** Revert chat to last saved state before preview. */
export function cancelGlassPreview(): boolean {
  const restore = previewSnapshot ?? loadGlassFormState();
  previewSnapshot = null;
  if (!restore.formId) {
    const root = getChatRoot();
    if (root) {
      delete root.dataset.glassForm;
      delete root.dataset.glassPreview;
      root.style.removeProperty("--gf-custom-rgb");
      root.style.removeProperty("--gf-accent");
    }
    return true;
  }
  return applyGlassFormToDom(restore.formId, restore.tintHex, false);
}

export function applyGlassForm(id: GlassFormId | null): boolean {
  previewSnapshot = null;
  if (!id) {
    persistGlassFormState({ formId: null, tintHex: loadGlassFormTint() });
    const root = getChatRoot();
    if (!root) return false;
    delete root.dataset.glassForm;
    delete root.dataset.glassPreview;
    root.style.removeProperty("--gf-custom-rgb");
    root.style.removeProperty("--gf-accent");
    return true;
  }
  return commitGlassForm(id, loadGlassFormTint());
}

export function ensureGlassFormApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const state = loadGlassFormState();
  const ok = state.formId
    ? applyGlassFormToDom(state.formId, state.tintHex, false)
    : applyGlassForm(null);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureGlassFormApplied(attempt + 1));
  }
}

export function getGlassFormLabel(id: GlassFormId | null): string {
  if (!id) return "افتراضي";
  return GLASS_FORM_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function isGlassPreviewActive(): boolean {
  return previewSnapshot !== null;
}
