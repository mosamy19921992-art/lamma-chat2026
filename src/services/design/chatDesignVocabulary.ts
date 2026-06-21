/** Arabic ↔ chat UI region vocabulary for the owner design bot */

export type ChatDesignRegion =
  | "top-header"
  | "room-header-strip"
  | "topic-bar"
  | "chat-feed"
  | "chat-wallpaper"
  | "composer"
  | "side-columns"
  | "column-cards"
  | "message-bubbles"
  | "global";

export type RegionAction =
  | "darken"
  | "lighten"
  | "clean"
  | "remove-colors"
  | "flow-strip"
  | "chase-border"
  | "glass"
  | "more-blur"
  | "hide";

export interface RegionStyleState {
  darken: number;
  clean: boolean;
  removeColors: boolean;
  flowStrip: boolean;
  chaseBorder: boolean;
  outerChaseOnly: boolean;
  hidden: boolean;
  blurPx: number;
}

export interface DetectedDesignCommand {
  region: ChatDesignRegion;
  regionScore: number;
  actions: RegionAction[];
  regionLabelAr: string;
  actionLabelsAr: string[];
}

export const REGION_LABELS_AR: Record<ChatDesignRegion, string> = {
  "top-header": "الشريط العلوي (هيدر الموقع)",
  "room-header-strip": "الشريط تحت الهيدر (هيدر الغرفة)",
  "topic-bar": "شريط موضوع الغرفة",
  "chat-feed": "منطقة الرسائل / الشات",
  "chat-wallpaper": "خلفية الشات (ورق الحائط)",
  composer: "شريط الكتابة (Composer)",
  "side-columns": "الأعمدة الجانبية",
  "column-cards": "بطاقات الأعمدة (VIP، راديو، غرف…)",
  "message-bubbles": "فقاعات الرسائل",
  global: "الموقع كله",
};

/** Owner-facing cheat sheet — shown in bot hints */
export const DESIGN_VOCABULARY_HINT = `📖 مصطلحات التصميم:
• الشريط العلوي = هيدر الموقع (LAMMA + أزرار)
• الشريط تحت الهيدر = هيدر الغرفة + الموضوع
• خلفية الشات = ورق الحائط خلف الرسائل
• الأعمدة = VIP / راديو / غرف يمين ويسار
• شريط الكتابة = مكان ما بتكتب الرسالة
• فقاعات = شكل رسائل الناس`;

const REGION_TERMS: Record<ChatDesignRegion, string[]> = {
  "top-header": [
    "الشريط العلوي",
    "شريط علوي",
    "هيدر الموقع",
    "هيدر الشات",
    "الهيدر",
    "الهيد",
    "header",
    "top bar",
    "app bar",
    "lamma chat",
    "العلوي",
    "اعلى الموقع",
    "أعلى الموقع",
  ],
  "room-header-strip": [
    "تحت الهيد",
    "تحت الهيدر",
    "الشريط اللي تحت",
    "شريط تحت",
    "هيدر الغرفة",
    "شريط الغرفة",
    "room header",
    "fire-underline",
    "اسم الغرفة",
    "عنوان الغرفة",
  ],
  "topic-bar": [
    "موضوع الغرفة",
    "topic",
    "شريط الموضوع",
    "lamma-topic",
    "الموضوع",
  ],
  "chat-feed": [
    "منطقة الرسائل",
    "الرسائل",
    "messages",
    "feed",
    "منطقة الشات",
    "وسط الشات",
    "الشات نفسه",
  ],
  "chat-wallpaper": [
    "خلفية الشات",
    "خلفيه الشات",
    "خلفية",
    "ورق الحائط",
    "wallpaper",
    "background",
    "الخلفية",
    "صورة الخلفية",
    "خلفيه",
  ],
  composer: [
    "شريط الكتابة",
    "مكان الكتابة",
    "composer",
    "input",
    "حقل الكتابة",
    "الكتابة",
    "المدخل",
    "شريط الارسال",
    "شريط الإرسال",
  ],
  "side-columns": [
    "العمود",
    "الأعمدة",
    "اعمدة",
    "الجانب",
    "sidebar",
    "side column",
    "العمود الجانبي",
    "الاعمدة الجانبيه",
    "الاعمدة",
    "الأعمدة الجانبية",
  ],
  "column-cards": [
    "بطاق",
    "بطايق",
    "card",
    "vip",
    "راديو",
    "الراديو",
    "راديو dj",
    "dj",
    "بطاقة vip",
    "بطاقات",
    "موسيقى",
    "الموسيقى",
    "music",
    "player",
    "مشغل",
    "مشغل موسيقى",
    "audio",
    "sound",
    "wave",
    "equalizer",
    "loader",
    "لودر",
    "تحميل",
    "spinner",
    "toggle",
    "switch",
    "checkbox",
  ],
  "message-bubbles": [
    "فقاع",
    "bubble",
    "الرسالة",
    "رسائل",
    "بابل",
    "فقاعات",
  ],
  global: [
    "الموقع",
    "كل حاجة",
    "كله",
    "global",
    "whole site",
    "التطبيق",
  ],
};

const ACTION_TERMS: Record<RegionAction, string[]> = {
  darken: ["غامق", "غمق", "داكن", "أغمق", "اغمق", "dark", "darker", "dim"],
  lighten: ["فاتح", "أفتح", "افتح", "light", "lighter", "bright", "brighten"],
  clean: ["نظافة", "نظف", "نظيف", "clean", "تنظيف", "نظفها", "نضف"],
  "remove-colors": [
    "ازالة الالوان",
    "إزالة الألوان",
    "ازاله الالوان",
    "بدون الوان",
    "بدون ألوان",
    "remove color",
    "neutral",
    "محايد",
    "الوان",
    "ألوان",
    "شيل الالوان",
  ],
  "flow-strip": [
    "شريط نور",
    "شريط ملون",
    "flow",
    "gradient strip",
    "خط متحرك",
    "خط ملون",
  ],
  "chase-border": [
    "يلف",
    "يدور",
    "بيجرى",
    "يجري",
    "chase",
    "border spin",
    "حول البطاق",
    "حوالين",
    "حول",
  ],
  glass: ["زجاج", "glass", "frosted", "blur glass"],
  "more-blur": ["ضباب", "blur", "blurrier", "more blur"],
  hide: ["اخفي", "أخفِ", "hide", "شيل", "امسح", "بدون"],
};

function scoreTerms(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower.includes(term.toLowerCase())) {
      score += term.length >= 8 ? 3 : term.length >= 5 ? 2 : 1;
    }
  }
  return score;
}

export function detectDesignActions(text: string): RegionAction[] {
  const found: RegionAction[] = [];
  for (const [action, terms] of Object.entries(ACTION_TERMS) as [
    RegionAction,
    string[],
  ][]) {
    if (scoreTerms(text, terms) > 0) found.push(action);
  }
  return found;
}

export function detectDesignRegion(text: string): DetectedDesignCommand | null {
  const lower = text.toLowerCase();

  // Explicit phrase: strip under header
  if (
    (lower.includes("تحت") && (lower.includes("هيد") || lower.includes("header"))) ||
    lower.includes("الشريط اللي تحت")
  ) {
    const actions = detectDesignActions(text);
    return buildCommand("room-header-strip", 10, actions);
  }

  // Wallpaper / background without other region winning
  if (
    scoreTerms(text, REGION_TERMS["chat-wallpaper"]) > 0 &&
    scoreTerms(text, REGION_TERMS["column-cards"]) === 0
  ) {
    const actions = detectDesignActions(text);
    const region =
      scoreTerms(text, REGION_TERMS["chat-feed"]) >
      scoreTerms(text, REGION_TERMS["chat-wallpaper"])
        ? "chat-feed"
        : "chat-wallpaper";
    return buildCommand(region, scoreTerms(text, REGION_TERMS[region]), actions);
  }

  // Column cards: VIP / radio / music widgets in side columns
  if (
    scoreTerms(text, REGION_TERMS["column-cards"]) > 0 &&
    (scoreTerms(text, REGION_TERMS["side-columns"]) > 0 ||
      scoreTerms(text, REGION_TERMS["column-cards"]) >= 1)
  ) {
    return buildCommand(
      "column-cards",
      scoreTerms(text, REGION_TERMS["column-cards"]) +
        scoreTerms(text, REGION_TERMS["side-columns"]),
      detectDesignActions(text),
    );
  }

  let best: ChatDesignRegion = "global";
  let bestScore = 0;
  for (const [region, terms] of Object.entries(REGION_TERMS) as [
    ChatDesignRegion,
    string[],
  ][]) {
    const s = scoreTerms(text, terms);
    if (s > bestScore) {
      bestScore = s;
      best = region;
    }
  }

  if (bestScore === 0) return null;
  return buildCommand(best, bestScore, detectDesignActions(text));
}

function buildCommand(
  region: ChatDesignRegion,
  regionScore: number,
  actions: RegionAction[],
): DetectedDesignCommand {
  const actionLabelsAr = actions.map((a) => ACTION_LABELS_AR[a]).filter(Boolean);
  return {
    region,
    regionScore,
    actions,
    regionLabelAr: REGION_LABELS_AR[region],
    actionLabelsAr,
  };
}

const ACTION_LABELS_AR: Record<RegionAction, string> = {
  darken: "تغميق",
  lighten: "تفتيح",
  clean: "تنظيف",
  "remove-colors": "إزالة الألوان",
  "flow-strip": "شريط نور متحرك",
  "chase-border": "إضاءة حول الحواف",
  glass: "زجاج",
  "more-blur": "زيادة الضبابية",
  hide: "إخفاء",
};

export function createDefaultRegionState(): RegionStyleState {
  return {
    darken: 0,
    clean: false,
    removeColors: false,
    flowStrip: false,
    chaseBorder: false,
    outerChaseOnly: false,
    hidden: false,
    blurPx: 18,
  };
}

export function createDefaultRegions(): Record<ChatDesignRegion, RegionStyleState> {
  return {
    "top-header": createDefaultRegionState(),
    "room-header-strip": createDefaultRegionState(),
    "topic-bar": createDefaultRegionState(),
    "chat-feed": createDefaultRegionState(),
    "chat-wallpaper": createDefaultRegionState(),
    "composer": createDefaultRegionState(),
    "side-columns": createDefaultRegionState(),
    "column-cards": createDefaultRegionState(),
    "message-bubbles": createDefaultRegionState(),
    global: createDefaultRegionState(),
  };
}
