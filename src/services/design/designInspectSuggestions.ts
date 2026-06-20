import type { ChatDesignRegion } from "./chatDesignVocabulary";
import { REGION_LABELS_AR } from "./chatDesignVocabulary";
import type { UniversalStyleConfig } from "./universalStyleTypes";

export type DesignSuggestionCategory =
  | "colors"
  | "background"
  | "shape"
  | "readability"
  | "layout";

export type DesignSuggestionTone = "warn" | "info" | "good";

export interface DesignInspectSuggestion {
  id: string;
  tone: DesignSuggestionTone;
  category: DesignSuggestionCategory;
  title: string;
  reason: string;
  /** Arabic prompt passed to previewDesignPrompt */
  prompt: string;
  regions?: ChatDesignRegion[];
}

const CATEGORY_LABELS: Record<DesignSuggestionCategory, string> = {
  colors: "ألوان",
  background: "خلفية",
  shape: "شكل",
  readability: "قراءة",
  layout: "تخطيط",
};

export function getSuggestionCategoryLabel(
  category: DesignSuggestionCategory,
): string {
  return CATEGORY_LABELS[category];
}


function parseHexLuminance(color: string): number | null {
  const hex = color.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
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

function isBusyBackground(config: UniversalStyleConfig): boolean {
  const layer = config.backgrounds.global;
  return layer.kind === "image" || layer.kind === "video";
}

function regionPhrase(region: ChatDesignRegion): string {
  const map: Partial<Record<ChatDesignRegion, string>> = {
    "top-header": "الشريط العلوي",
    "room-header-strip": "الشريط تحت الهيدر",
    "topic-bar": "شريط موضوع الغرفة",
    "chat-feed": "منطقة الرسائل",
    "chat-wallpaper": "خلفية الشات",
    composer: "شريط الكتابة",
    "side-columns": "الأعمدة الجانبية",
    "column-cards": "بطاقات الأعمدة",
    "message-bubbles": "فقاعات الرسائل",
    global: "الموقع",
  };
  return map[region] || REGION_LABELS_AR[region];
}

function pushUnique(
  list: DesignInspectSuggestion[],
  suggestion: DesignInspectSuggestion,
): void {
  if (list.some((item) => item.id === suggestion.id)) return;
  list.push(suggestion);
}

function buildGlobalSuggestions(config: UniversalStyleConfig): DesignInspectSuggestion[] {
  const out: DesignInspectSuggestion[] = [];
  const globalBg = config.backgrounds.global;

  if (
    isBusyBackground(config) &&
    globalBg.overlayOpacity < 0.28
  ) {
    pushUnique(out, {
      id: "bg-overlay-low",
      tone: "warn",
      category: "background",
      title: "الخلفية تغطي على النص",
      reason:
        "صورة أو فيديو الخلفية بدون طبقة داكنة كافية — الرسائل والهيدر قد تكون صعبة القراءة.",
      prompt: "غامّق خلفية الشات مع overlay أقوى للقراءة",
      regions: ["chat-wallpaper", "chat-feed"],
    });
  }

  if (config.backgrounds.feed.kind !== "color" && config.backgrounds.feed.overlayOpacity < 0.2) {
    pushUnique(out, {
      id: "feed-bg-busy",
      tone: "warn",
      category: "readability",
      title: "منطقة الرسائل مزدحمة بصرياً",
      reason: "خلفية منطقة الشات فيها تفاصيل كثيرة بدون تعتيم كافٍ.",
      prompt: "نظّف منطقة الرسائل وغامّق خلفيتها",
      regions: ["chat-feed"],
    });
  }

  const bgLum = parseHexLuminance(config.palette.bg);
  const textLum = parseHexLuminance(config.palette.text.replace(/[^#0-9a-f]/gi, "") || "#f8fafc");
  if (bgLum !== null && textLum !== null && Math.abs(bgLum - textLum) < 0.35 && bgLum > 0.25) {
    pushUnique(out, {
      id: "palette-low-contrast",
      tone: "warn",
      category: "colors",
      title: "تباين الألوان ضعيف",
      reason: "لون الخلفية قريب من لون النص — العين تتعب والقراءة تبطأ.",
      prompt: "شيل ألوان الموقع وخلّي الخلفية أغمق والنص أوضح",
      regions: ["global"],
    });
  }

  if (config.buttons.neon && config.effects.sidebarCardChase) {
    pushUnique(out, {
      id: "neon-overload",
      tone: "warn",
      category: "colors",
      title: "ألوان نيون كثيرة",
      reason: "الأزرار النيون + شريط النور على البطاقات معاً يعطي إحساساً مزدحماً.",
      prompt: "نظّف بطاقات الأعمدة وخفّف النيون — ستايل هادئ",
      regions: ["column-cards", "global"],
    });
  }

  if (config.glass.opacity < 0.07 && config.glass.blurPx < 14) {
    pushUnique(out, {
      id: "glass-too-weak",
      tone: "info",
      category: "shape",
      title: "الزجاج شفاف جداً",
      reason: "شريط الكتابة والبطاقات تقريباً بدون ضبابية — الشكل يبدو مسطحاً.",
      prompt: "زجاج على شريط الكتابة مع blur أكثر",
      regions: ["composer", "column-cards"],
    });
  }

  if (config.buttons.radiusPx < 10) {
    pushUnique(out, {
      id: "buttons-sharp",
      tone: "info",
      category: "shape",
      title: "زوايا الأزرار حادة",
      reason: "الزوايا الحادة تعطي مظهراً تقنياً قاسياً — التدوير يرفع الراحة البصرية.",
      prompt: "make buttons rounder glassmorphic look",
      regions: ["global"],
    });
  }

  if (config.buttons.radiusPx > 22) {
    pushUnique(out, {
      id: "buttons-too-round",
      tone: "info",
      category: "shape",
      title: "الأزرار دائرية أكثر من اللازم",
      reason: "التدوير الزائد قد يضعف الإحساس بالاحتراف في واجهة شات.",
      prompt: "خلّي الأزرار أقل استدارة — cyberpunk neon",
      regions: ["global"],
    });
  }

  if (
    config.effects.chatHeaderStyle === "flow-strip" &&
    isBusyBackground(config)
  ) {
    pushUnique(out, {
      id: "header-busy-bg",
      tone: "warn",
      category: "layout",
      title: "الهيدر يتنافس مع الخلفية",
      reason: "شريط النور على الهيدر + خلفية صورة = ازدحام في أعلى الشاشة.",
      prompt: "زجاج على الشريط العلوي وخفّف شريط النور",
      regions: ["top-header", "chat-wallpaper"],
    });
  }

  if (config.themeId !== "lamma-default" && config.palette.accent !== "#10b981") {
    pushUnique(out, {
      id: "theme-accent-drift",
      tone: "info",
      category: "colors",
      title: "اللون الأساسي بعيد عن هوية لمة",
      reason: `الستايل «${config.label}» يستخدم accent مختلف — قد لا يتماشى مع الشعار الأخضر.`,
      prompt: "رجّع accent أخضر emerald مع glass هادئ",
      regions: ["global"],
    });
  }

  return out;
}

function buildRegionSuggestions(
  config: UniversalStyleConfig,
  region: ChatDesignRegion,
): DesignInspectSuggestion[] {
  const out: DesignInspectSuggestion[] = [];
  const phrase = regionPhrase(region);
  const state = config.regions?.[region];

  if (!state) return out;

  if (state.hidden) {
    pushUnique(out, {
      id: `region-${region}-hidden`,
      tone: "warn",
      category: "layout",
      title: `${phrase} مخفي حالياً`,
      reason: "هذا الجزء مخفي — قد يبدو الشات ناقصاً أو مكسوراً للزوار.",
      prompt: `نظّف ${phrase} وأعد ظهوره بزجاج خفيف`,
      regions: [region],
    });
  }

  if (state.darken > 0.45) {
    pushUnique(out, {
      id: `region-${region}-too-dark`,
      tone: "warn",
      category: "colors",
      title: `${phrase} داكن جداً`,
      reason: "التغميق الزائد يخفي التفاصيل ويجعل المنطقة ثقيلة.",
      prompt: `فاتّح ${phrase}`,
      regions: [region],
    });
  }

  if (state.removeColors || state.clean) {
    pushUnique(out, {
      id: `region-${region}-too-flat`,
      tone: "info",
      category: "colors",
      title: `${phrase} بلا ألوان`,
      reason: "المنطقة محايدة جداً — ممكن تضيف لمسة accent خفيفة.",
      prompt: `شريط نور على ${phrase} بلون emerald`,
      regions: [region],
    });
  }

  if (region === "chat-wallpaper" && isBusyBackground(config) && config.backgrounds.global.overlayOpacity < 0.35) {
    pushUnique(out, {
      id: "wallpaper-readability",
      tone: "warn",
      category: "background",
      title: "ورق الحائط يشتت العين",
      reason: "الصورة خلف الرسائل واضحة أكثر من اللازم.",
      prompt: "غامّق خلفية الشات overlay 45%",
      regions: ["chat-wallpaper"],
    });
  }

  if (region === "composer" && config.glass.opacity < 0.1) {
    pushUnique(out, {
      id: "composer-weak",
      tone: "warn",
      category: "readability",
      title: "شريط الكتابة غير واضح",
      reason: "الشفافية العالية تجعل مربع الكتابة يندمج مع الخلفية.",
      prompt: "زجاج على شريط الكتابة مع ضبابية أكثر",
      regions: ["composer"],
    });
  }

  if (region === "message-bubbles" && config.glass.borderOpacity < 0.08) {
    pushUnique(out, {
      id: "bubbles-flat",
      tone: "info",
      category: "shape",
      title: "فقاعات الرسائل مسطّحة",
      reason: "حدود الفقاعات خفيفة — صعب تمييز رسائلك عن رسائل الآخرين.",
      prompt: "زجاج على فقاعات الرسائل مع حدود أوضح",
      regions: ["message-bubbles"],
    });
  }

  if (region === "column-cards" && !config.effects.sidebarCardChase) {
    pushUnique(out, {
      id: "cards-no-chase",
      tone: "info",
      category: "shape",
      title: "بطاقات الأعمدة بلا إضاءة",
      reason: "VIP والراديو يبدوان مثل باقي الواجهة — شريط النور يبرز المتجر.",
      prompt: "شريط نور حوالين بطاقات الأعمدة",
      regions: ["column-cards"],
    });
  }

  if (region === "top-header" && config.effects.chatHeaderStyle === "none") {
    pushUnique(out, {
      id: "header-plain",
      tone: "info",
      category: "layout",
      title: "الهيدر بلا طابع",
      reason: "الشريط العلوي افتراضي — زجاج minimal يعطي فخامة بدون ازدحام.",
      prompt: "زجاج على الشريط العلوي glass minimal",
      regions: ["top-header"],
    });
  }

  return out;
}

export function buildDesignInspectSuggestions(
  config: UniversalStyleConfig | null | undefined,
  selectedRegion?: ChatDesignRegion | null,
  limit = 5,
): DesignInspectSuggestion[] {
  const base = config;
  if (!base) return [];

  const global = buildGlobalSuggestions(base);
  const regional = selectedRegion
    ? buildRegionSuggestions(base, selectedRegion)
    : [];

  const merged = [...regional, ...global];

  if (merged.length === 0) {
    return [
      {
        id: "all-good-premium",
        tone: "good",
        category: "colors",
        title: "الشكل متوازن 👍",
        reason: "ما فيش مشاكل واضحة — جرّب تحسيناً خفيفاً للفخامة.",
        prompt: "fabulous glassmorphic look emerald calm",
        regions: selectedRegion ? [selectedRegion] : ["global"],
      },
    ];
  }

  return merged.slice(0, limit);
}

export function isDesignSuggestionPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  const terms = [
    "اقتراح",
    "اقترح",
    "راجع التصميم",
    "راجع الشكل",
    "الألوان مش",
    "الوان مش",
    "الخلفية مش",
    "خلفيه مش",
    "الشكل مش",
    "مش مناسب",
    "مش مظبوط",
    "حسّن",
    "حسن",
    "تحسين",
    "suggest",
    "improve design",
    "fix colors",
    "fix background",
    "what looks wrong",
    "ايه الغلط",
    "إيه الغلط",
  ];
  return terms.some((term) => lower.includes(term));
}

export function formatDesignSuggestionsSummary(
  suggestions: DesignInspectSuggestion[],
): string {
  if (suggestions.length === 0) {
    return "✅ الشكل الحالي متوازن — لا توجد ملاحظات حرجة. جرّب «glassmorphic emerald calm» للفخامة.";
  }

  const lines = suggestions.map((item, index) => {
    const icon =
      item.tone === "warn" ? "⚠️" : item.tone === "good" ? "✅" : "💡";
    const cat = getSuggestionCategoryLabel(item.category);
    return `${icon} ${index + 1}. ${item.title} (${cat})\n   ${item.reason}\n   ↳ جرّب: «${item.prompt}»`;
  });

  return [
    "💡 اقتراحات بوت التصميم — ألوان / خلفيات / شكل:",
    "",
    ...lines,
    "",
    "👆 انسخ أي جملة واكتبها هنا للمعاينة، أو افتح 🎯 حدّد بالماوس واضغط الاقتراح.",
  ].join("\n");
}

export function formatSuggestionOneLiner(suggestion: DesignInspectSuggestion): string {
  return `${suggestion.title} — ${suggestion.reason}`;
}
