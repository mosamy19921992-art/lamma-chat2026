import { setDesignPreviewActive } from "./designPreviewDom";
import { scheduleDesignOverlaysSync } from "./designOverlaySync";

export type PmBubbleStyleId =
  | "classic"
  | "imessage"
  | "messenger"
  | "telegram"
  | "romantic"
  | "glass-dark";

export interface PmBubbleStylePreset {
  id: PmBubbleStyleId;
  title: string;
  subtitle: string;
  emoji: string;
}

export const PM_BUBBLE_STYLE_PRESETS: PmBubbleStylePreset[] = [
  { id: "classic", title: "لامة كلاسيك", subtitle: "ذهبي/أبيض افتراضي", emoji: "💬" },
  { id: "imessage", title: "iMessage", subtitle: "أخضر/رمادي + ذيل", emoji: "🍎" },
  { id: "messenger", title: "Messenger", subtitle: "أزرق ناعم", emoji: "🔵" },
  { id: "telegram", title: "Telegram", subtitle: "سماوي + زوايا ناعمة", emoji: "✈️" },
  { id: "romantic", title: "رومانسي", subtitle: "وردي/أزرق", emoji: "💕" },
  { id: "glass-dark", title: "زجاج داكن", subtitle: "glassmorphism شفاف", emoji: "🪟" },
];

const STORAGE_KEY = "lamma_pm_bubble_style";
const ROOT_SELECTOR = ".lamma-neutral-glass";

let previewSnapshot: PmBubbleStyleId | null = null;

function getRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(ROOT_SELECTOR) as HTMLElement | null;
}

function applyToDom(id: PmBubbleStyleId, preview: boolean): boolean {
  const root = getRoot();
  if (!root) return false;
  if (id === "classic") {
    root.removeAttribute("data-pm-style");
  } else {
    root.setAttribute("data-pm-style", id);
  }
  if (preview) {
    root.setAttribute("data-pm-style-preview", "true");
    setDesignPreviewActive(true);
  } else {
    root.removeAttribute("data-pm-style-preview");
  }
  return true;
}

export function loadPmBubbleStyleId(): PmBubbleStyleId {
  if (typeof window === "undefined") return "classic";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && PM_BUBBLE_STYLE_PRESETS.some((p) => p.id === raw)) {
      return raw as PmBubbleStyleId;
    }
  } catch {
    // ignore
  }
  return "classic";
}

export function getPmBubbleStyleLabel(id: PmBubbleStyleId): string {
  return PM_BUBBLE_STYLE_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function previewPmBubbleStyle(id: PmBubbleStyleId): boolean {
  if (!previewSnapshot) {
    previewSnapshot = loadPmBubbleStyleId();
  }
  return applyToDom(id, true);
}

export function commitPmBubbleStyle(
  id: PmBubbleStyleId,
  options?: { skipSync?: boolean },
): boolean {
  const ok = applyToDom(id, false);
  if (!ok) return false;
  try {
    if (id === "classic") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
  } catch {
    // ignore
  }
  previewSnapshot = null;
  if (!options?.skipSync) scheduleDesignOverlaysSync();
  return true;
}

export function cancelPmBubbleStylePreview(): boolean {
  const restore = previewSnapshot ?? loadPmBubbleStyleId();
  previewSnapshot = null;
  return applyToDom(restore, false);
}

export function ensurePmBubbleStyleApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const ok = applyToDom(loadPmBubbleStyleId(), false);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensurePmBubbleStyleApplied(attempt + 1));
  }
}
