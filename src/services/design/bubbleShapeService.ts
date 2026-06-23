import { setDesignPreviewActive } from "./designPreviewDom";
import { scheduleDesignOverlaysSync } from "./designOverlaySync";

export type BubbleShapeId =
  | "default"
  | "whatsapp"
  | "facebook"
  | "ios"
  | "telegram";

export interface BubbleShapePreset {
  id: BubbleShapeId;
  title: string;
  subtitle: string;
  emoji: string;
}

export const BUBBLE_SHAPE_PRESETS: BubbleShapePreset[] = [
  {
    id: "default",
    title: "لامة (افتراضي)",
    subtitle: "فقاعات دائرية متوازنة",
    emoji: "💬",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    subtitle: "ذيل + زوايا غير متماثلة",
    emoji: "🟢",
  },
  {
    id: "facebook",
    title: "Facebook",
    subtitle: "Messenger — فقاعات ناعمة",
    emoji: "🔵",
  },
  {
    id: "ios",
    title: "iOS",
    subtitle: "فقاعات Apple Messages",
    emoji: "🍎",
  },
  {
    id: "telegram",
    title: "Telegram",
    subtitle: "زوايا ناعمة + ذيل خفيف",
    emoji: "✈️",
  },
];

const STORAGE_KEY = "lamma_bubble_shape";
const ROOT_SELECTOR = ".lamma-neutral-glass";

let previewSnapshot: BubbleShapeId | null = null;

function getRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(ROOT_SELECTOR) as HTMLElement | null;
}

function applyToDom(id: BubbleShapeId, preview: boolean): boolean {
  const root = getRoot();
  if (!root) return false;
  if (id === "default") {
    root.removeAttribute("data-bubble-shape");
  } else {
    root.setAttribute("data-bubble-shape", id);
  }
  if (preview) {
    root.setAttribute("data-bubble-shape-preview", "true");
    setDesignPreviewActive(true);
  } else {
    root.removeAttribute("data-bubble-shape-preview");
  }
  return true;
}

export function loadBubbleShapeId(): BubbleShapeId {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && BUBBLE_SHAPE_PRESETS.some((p) => p.id === raw)) {
      return raw as BubbleShapeId;
    }
  } catch {
    // ignore
  }
  return "default";
}

export function getBubbleShapeLabel(id: BubbleShapeId): string {
  return BUBBLE_SHAPE_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function previewBubbleShape(id: BubbleShapeId): boolean {
  if (!previewSnapshot) {
    previewSnapshot = loadBubbleShapeId();
  }
  return applyToDom(id, true);
}

export function commitBubbleShape(
  id: BubbleShapeId,
  options?: { skipSync?: boolean },
): boolean {
  const ok = applyToDom(id, false);
  if (!ok) return false;
  try {
    if (id === "default") {
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

export function cancelBubbleShapePreview(): boolean {
  const restore = previewSnapshot ?? loadBubbleShapeId();
  previewSnapshot = null;
  return applyToDom(restore, false);
}

export function ensureBubbleShapeApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const ok = applyToDom(loadBubbleShapeId(), false);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureBubbleShapeApplied(attempt + 1));
  }
}
