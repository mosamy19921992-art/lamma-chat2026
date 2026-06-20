import type { ChatDesignRegion, RegionAction } from "./chatDesignVocabulary";
import { REGION_LABELS_AR } from "./chatDesignVocabulary";

/** Short Arabic phrase per region — tuned for parseOwnerStylePrompt */
const REGION_PROMPT_PHRASE: Record<ChatDesignRegion, string> = {
  "top-header": "الشريط العلوي",
  "room-header-strip": "الشريط تحت الهيدر",
  "topic-bar": "شريط موضوع الغرفة",
  "chat-feed": "منطقة الرسائل",
  "chat-wallpaper": "خلفية الشات",
  composer: "شريط الكتابة",
  "side-columns": "الأعمدة الجانبية",
  "column-cards": "بطاقات الأعمدة",
  "message-bubbles": "فقاعات الرسائل",
  global: "الموقع كله",
};

const ACTION_PROMPT_VERB: Record<RegionAction, string> = {
  darken: "غامّق",
  lighten: "فاتّح",
  clean: "نظّف",
  "remove-colors": "شيل ألوان",
  "flow-strip": "شريط نور على",
  "chase-border": "شريط نور حوالين",
  glass: "زجاج على",
  "more-blur": "زيادة ضبابية",
  hide: "اخفِ",
};

export const INSPECT_ACTION_LABELS_AR: Record<RegionAction, string> = {
  darken: "غامّق",
  lighten: "فاتّح",
  clean: "نظّف",
  "remove-colors": "شيل الألوان",
  "flow-strip": "شريط نور",
  "chase-border": "إضاءة حواف",
  glass: "زجاج",
  "more-blur": "ضبابية",
  hide: "إخفاء",
};

/** Quick actions shown per region in inspect panel */
export const INSPECT_QUICK_ACTIONS: Record<ChatDesignRegion, RegionAction[]> = {
  "top-header": ["darken", "glass", "hide", "clean"],
  "room-header-strip": ["darken", "glass", "flow-strip", "hide"],
  "topic-bar": ["darken", "glass", "clean"],
  "chat-feed": ["clean", "remove-colors", "darken"],
  "chat-wallpaper": ["clean", "remove-colors", "darken", "lighten"],
  composer: ["darken", "glass", "more-blur"],
  "side-columns": ["darken", "clean", "glass"],
  "column-cards": ["chase-border", "glass", "darken"],
  "message-bubbles": ["glass", "clean", "darken"],
  global: ["clean", "remove-colors", "darken"],
};

export function resolveDesignRegionFromElement(
  el: Element | null,
): ChatDesignRegion | null {
  if (!el) return null;

  const tagged = el.closest("[data-design-region]");
  if (tagged) {
    const value = tagged.getAttribute("data-design-region");
    if (value && value in REGION_LABELS_AR) {
      return value as ChatDesignRegion;
    }
  }

  const col = el.closest("[data-col]");
  if (col) {
    const side = col.getAttribute("data-col");
    if (side === "left" || side === "right") return "side-columns";
    if (side === "center") return "chat-feed";
  }

  return null;
}

export function resolveDesignRegionElement(el: Element | null): HTMLElement | null {
  if (!el) return null;
  const tagged = el.closest("[data-design-region]");
  if (tagged instanceof HTMLElement) return tagged;
  const col = el.closest("[data-col]");
  if (col instanceof HTMLElement) return col;
  return null;
}

export function buildRegionActionPrompt(
  region: ChatDesignRegion,
  action: RegionAction,
): string {
  const regionPhrase = REGION_PROMPT_PHRASE[region];
  const verb = ACTION_PROMPT_VERB[action];
  if (action === "chase-border" || action === "flow-strip" || action === "glass") {
    return `${verb} ${regionPhrase}`;
  }
  return `${verb} ${regionPhrase}`;
}

export function getRegionLabelAr(region: ChatDesignRegion): string {
  return REGION_LABELS_AR[region];
}
