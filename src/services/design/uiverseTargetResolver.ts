import type { ChatDesignRegion } from "./chatDesignVocabulary";
import { detectDesignRegion, REGION_LABELS_AR } from "./chatDesignVocabulary";

function validateRootDomain(url?: string, domain?: string): boolean {
  if (!url || !domain) {
    return false;
  }
  try {
    const host = url.includes("://") ? new URL(url).hostname : String(url);
    return host === domain || host.endsWith('.' + domain);
  } catch {
    return false;
  }
}

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

/** Common target hints shown in UI and bot replies. */
export const UIVERSE_TARGET_HINTS_AR = [
  "بطاقة الراديو / الموسيقى",
  "بطاقات الأعمدة (VIP، DJ)",
  "فقاعات الشات",
  "الأزرار",
  "شريط الكتابة",
  "خلفية الشات",
] as const;

const SLUG_REGION_HINTS: { pattern: RegExp; region: ChatDesignRegion; subTarget?: UiverseSubTarget }[] = [
  { pattern: /\/buttons?\b|\/radio-buttons?\b/i, region: "global", subTarget: "buttons" },
  { pattern: /\/loaders?\b/i, region: "column-cards" },
  { pattern: /\/cards?\b/i, region: "column-cards" },
  { pattern: /\/inputs?\b|\/forms?\b/i, region: "composer" },
  { pattern: /\/toggle|\/switch|\/checkbox/i, region: "column-cards" },
  { pattern: /music|radio|player|audio|sound|wave|equalizer|dj|vinyl|disc|spotify/i, region: "column-cards" },
  { pattern: /loader|spinner|spin|loading|penguin|hungry/i, region: "column-cards" },
  { pattern: /button|btn|cta|click/i, region: "global", subTarget: "buttons" },
  { pattern: /card|badge|ticket|panel/i, region: "column-cards" },
  { pattern: /bubble|message|chat/i, region: "message-bubbles" },
];

export interface UiverseTargetResolveOptions {
  /** When target text is vague, infer region from the fetched UIverse URL. */
  urlHint?: string;
  /** Allow a sensible default instead of hard failure (Design Center apply flow). */
  allowDefault?: boolean;
}

export function inferUiverseTargetFromUrl(
  url: string,
): { region: ChatDesignRegion; subTarget: UiverseSubTarget } | null {
  const trimmed = url.trim();
  let haystack = trimmed.toLowerCase();
  try {
    const parsed = new URL(trimmed);
    haystack = `${parsed.pathname} ${parsed.hostname} ${haystack}`.toLowerCase();
  } catch {
    // keep haystack
  }

  const uiverse = parseUiverseUrl(trimmed);
  if (uiverse) {
    haystack += ` ${uiverse.author} ${uiverse.slug}`;
  }

  for (const hint of SLUG_REGION_HINTS) {
    if (hint.pattern.test(haystack)) {
      return { region: hint.region, subTarget: hint.subTarget ?? "all" };
    }
  }
  return null;
}

export function extractUiversePromptParts(
  text: string,
): { url: string; targetText: string | null } | null {
  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!urlMatch?.[0]) return null;
  const url = urlMatch[0].replace(/[.,;:!?)]+$/, "");
  if (!parseUiverseUrl(url)) return null;
  const targetText = text.replace(urlMatch[0], " ").replace(/\s+/g, " ").trim();
  return { url, targetText: targetText || null };
}

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
  options?: UiverseTargetResolveOptions,
): { target: ResolvedUiverseTarget | null; error: string | null } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { target: null, error: "اكتب اسم العنصر المستهدف (مثل: فقاعات الشات، الأزرار، الخلفية)." };
  }

  let subTarget = scoreSubTarget(trimmed);
  const detected = detectDesignRegion(trimmed);

  let region: ChatDesignRegion = detected?.region ?? "global";

  if (!detected && subTarget === "background") {
    region = "chat-wallpaper";
  }

  if (region === "global" && subTarget === "all" && !detected) {
    const fromUrl = options?.urlHint
      ? inferUiverseTargetFromUrl(options.urlHint)
      : null;
    if (fromUrl) {
      region = fromUrl.region;
      if (fromUrl.subTarget !== "all") subTarget = fromUrl.subTarget;
    } else if (options?.allowDefault) {
      region = "column-cards";
    }
  }

  if (region === "global" && subTarget === "all" && !detected && !options?.allowDefault) {
    const hint = UIVERSE_TARGET_HINTS_AR.slice(0, 4).join("، ");
    return {
      target: null,
      error: `لم أتعرف على العنصر. جرّب: ${hint}.`,
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
    if (!validateRootDomain(host, "uiverse.io")) return null;

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

    while (parts.length > 2) {
      const head = parts[0];
      if (!head || !skip.has(head.toLowerCase())) break;
      parts.shift();
    }

    if (parts.length < 2) return null;
    const author = parts[0];
    const slug = parts[1];
    if (!author || !slug) return null;
    return { author, slug };
  } catch {
    const short = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (short?.[1] && short[2]) return { author: short[1], slug: short[2] };
    return null;
  }
}
