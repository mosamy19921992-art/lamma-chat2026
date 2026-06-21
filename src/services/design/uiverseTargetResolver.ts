import type { ChatDesignRegion } from "./chatDesignVocabulary";
import { detectDesignRegion, REGION_LABELS_AR } from "./chatDesignVocabulary";

export type UiverseSubTarget = "all" | "buttons" | "icons" | "background";

export interface ResolvedUiverseTarget {
  region: ChatDesignRegion;
  subTarget: UiverseSubTarget;
  labelAr: string;
  /** CSS selectors — always scoped under `.lamma-neutral-glass` */
  selectors: string[];
}

const SUB_TARGET_TERMS: Record<UiverseSubTarget, string[]> = {
  buttons: [
    "زر",
    "أزرار",
    "زرار",
    "button",
    "buttons",
    "btn",
    "lamma-accent-btn",
  ],
  icons: [
    "أيقون",
    "ايقون",
    "icon",
    "icons",
    "svg",
    "رمز",
    "رموز",
  ],
  background: [
    "خلفية",
    "خلفيه",
    "background",
    "wallpaper",
    "ورق الحائط",
    "backdrop",
  ],
  all: [],
};

const CHAT_ROOT = ".lamma-neutral-glass";

function scoreSubTarget(text: string): UiverseSubTarget {
  let best: UiverseSubTarget = "all";
  let bestScore = 0;
  for (const [key, terms] of Object.entries(SUB_TARGET_TERMS) as [
    UiverseSubTarget,
    string[],
  ][]) {
    if (key === "all") continue;
    const lower = text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term.toLowerCase())) {
        score += term.length >= 5 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}

function buildSelectors(
  region: ChatDesignRegion,
  subTarget: UiverseSubTarget,
): string[] {
  const regionAttr = `[data-design-region="${region}"]`;

  if (subTarget === "background") {
    if (region === "chat-wallpaper" || region === "global") {
      return [`${CHAT_ROOT} ${regionAttr}`, `${CHAT_ROOT} ${regionAttr}::before`];
    }
    return [`${CHAT_ROOT} ${regionAttr}`];
  }

  if (subTarget === "buttons") {
    const base = `${CHAT_ROOT} ${regionAttr}`;
    if (region === "global") {
      return [
        `${CHAT_ROOT} button`,
        `${CHAT_ROOT} [role="button"]`,
        `${CHAT_ROOT} .lamma-accent-btn`,
        `${CHAT_ROOT} .lamma-tab-soft`,
      ];
    }
    return [
      `${base} button`,
      `${base} [role="button"]`,
      `${base} .lamma-accent-btn`,
    ];
  }

  if (subTarget === "icons") {
    const base = `${CHAT_ROOT} ${regionAttr}`;
    if (region === "global") {
      return [`${CHAT_ROOT} svg`, `${CHAT_ROOT} [class*="icon"]`];
    }
    return [`${base} svg`, `${base} [class*="icon"]`];
  }

  switch (region) {
    case "message-bubbles":
      return [
        `${CHAT_ROOT} ${regionAttr} .lamma-message`,
        `${CHAT_ROOT} ${regionAttr} .lamma-pm-bubble`,
        `${CHAT_ROOT} ${regionAttr} [data-message-id]`,
      ];
    case "column-cards":
      return [
        `${CHAT_ROOT} ${regionAttr}`,
        `${CHAT_ROOT} ${regionAttr} .lamma-col-card`,
      ];
    case "composer":
      return [
        `${CHAT_ROOT} ${regionAttr}`,
        `${CHAT_ROOT} ${regionAttr} textarea`,
        `${CHAT_ROOT} ${regionAttr} input`,
      ];
    case "global":
      return [`${CHAT_ROOT}`];
    default:
      return [`${CHAT_ROOT} ${regionAttr}`];
  }
}

export function resolveUiverseTargetFromText(
  text: string,
): { target: ResolvedUiverseTarget | null; error: string | null } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { target: null, error: "اكتب اسم العنصر المستهدف (مثل: فقاعات الشات، الأزرار، الخلفية)." };
  }

  const subTarget = scoreSubTarget(trimmed);
  const detected = detectDesignRegion(trimmed);

  let region: ChatDesignRegion = detected?.region ?? "global";

  if (!detected && subTarget === "background") {
    region = "chat-wallpaper";
  }

  if (region === "global" && subTarget === "all" && !detected) {
    return {
      target: null,
      error:
        "لم أتعرف على العنصر. جرّب: فقاعات الشات، شريط الكتابة، الأزرار، الأيقونات، خلفية الشات، بطاقات الأعمدة.",
    };
  }

  const regionLabel = REGION_LABELS_AR[region];
  const subLabel =
    subTarget === "buttons"
      ? " — الأزرار"
      : subTarget === "icons"
        ? " — الأيقونات"
        : subTarget === "background"
          ? " — الخلفية"
          : "";

  return {
    target: {
      region,
      subTarget,
      labelAr: `${regionLabel}${subLabel}`,
      selectors: buildSelectors(region, subTarget),
    },
    error: null,
  };
}

export function parseUiverseUrl(
  url: string,
): { author: string; slug: string } | null {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    if (!host.endsWith("uiverse.io")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const skip = new Set([
      "elements",
      "buttons",
      "cards",
      "checkboxes",
      "switches",
      "loaders",
      "inputs",
      "radio-buttons",
      "forms",
      "patterns",
      "tooltips",
      "profile",
      "blog",
      "design",
    ]);

    while (parts.length > 2 && skip.has(parts[0].toLowerCase())) {
      parts.shift();
    }

    if (parts.length < 2) return null;
    return { author: parts[0], slug: parts[1] };
  } catch {
    const short = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (short) return { author: short[1], slug: short[2] };
    return null;
  }
}
