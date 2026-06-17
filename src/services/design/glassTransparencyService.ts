export type GlassFormId =
  | "classic"
  | "ultra-clear"
  | "soft-read"
  | "solid-focus"
  | "mirror"
  | "smoke-dark"
  | "crystal"
  | "ghost";

export interface GlassFormPreset {
  id: GlassFormId;
  title: string;
  subtitle: string;
  emoji: string;
  blurLabel: string;
  /** Inline preview for the gallery card (mini frosted form). */
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
    previewPanelBg: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
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
];

const STORAGE_KEY = "lamma_glass_form";

function getChatRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(".lamma-neutral-glass");
}

export function loadGlassFormId(): GlassFormId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (GLASS_FORM_PRESETS.some((p) => p.id === raw)) {
      return raw as GlassFormId;
    }
  } catch {
    // ignore
  }
  return null;
}

export function applyGlassForm(id: GlassFormId | null): boolean {
  const root = getChatRoot();
  if (!root) return false;

  if (!id) {
    delete root.dataset.glassForm;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  } else {
    root.dataset.glassForm = id;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  return true;
}

/** Re-apply saved glass form after chat mount (retries until root exists). */
export function ensureGlassFormApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const id = loadGlassFormId();
  const ok = applyGlassForm(id);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureGlassFormApplied(attempt + 1));
  }
}

export function getGlassFormLabel(id: GlassFormId | null): string {
  if (!id) return "افتراضي";
  return GLASS_FORM_PRESETS.find((p) => p.id === id)?.title ?? id;
}
