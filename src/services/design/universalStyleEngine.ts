import {
  createDefaultUniversalStyle,
  type StyleBackgroundKind,
  type StyleEngineParseResult,
  type UniversalStyleConfig,
} from "./universalStyleTypes";
import { isSafeHttpUrl } from "../../lib/chatHelpers";
import {
  createDefaultRegions,
  detectDesignRegion,
  DESIGN_VOCABULARY_HINT,
  type ChatDesignRegion,
  type RegionAction,
  type DetectedDesignCommand,
  type RegionStyleState,
} from "./chatDesignVocabulary";
import {
  buildDesignInspectSuggestions,
  formatDesignSuggestionsSummary,
  isDesignSuggestionPrompt,
} from "./designInspectSuggestions";
import { isDesignImportPrompt } from "./designImportCatalog";
import {
  formatDesignImportLibrarySummary,
  matchImportPackFromPrompt,
  describeImportPackApply,
} from "./designImportBotService";
import { loadImportedDesignPacks } from "./designNetImportService";
import { buildPackStyleConfig } from "./designPackStylePresets";
import { resetConfigWallpaperToDefault } from "./universalStyleStorage";

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const MAX_STYLE_URL_LENGTH = 2048;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hasAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w.toLowerCase()));
}

function isWallpaperResetPrompt(text: string): boolean {
  return hasAny(text, [
    "رجع الخلفية",
    "رجّع الخلفية",
    "ارجع الخلفية",
    "الخلفية الافتراضية",
    "خلفية افتراضية",
    "رجع الافتراضي",
    "رجّع الافتراضي",
    "استعادة الخلفية",
    "استرجاع الخلفية",
    "امسح الخلفية",
    "شيل الخلفية",
    "ازالة الخلفية",
    "إزالة الخلفية",
    "reset background",
    "default background",
    "man.png",
    "/man.png",
  ]);
}

function wantsChatHeaderStyle(text: string): boolean {
  return hasAny(text, [
    "هيدر",
    "header",
    "الهيد",
    "العلوي",
    "شريط علوي",
    "top bar",
    "app bar",
    "رأس الشات",
    "اعلى الشات",
    "أعلى الشات",
    "الهيدر",
    "هيدر الشات",
    "bar العلوي",
  ]);
}

type StyleIntent = "sidebar-chase" | "chat-header" | "theme";

function detectStyleIntent(text: string): StyleIntent | null {
  if (wantsSidebarCardChaseBorder(text)) return "sidebar-chase";
  if (wantsChatHeaderStyle(text)) return "chat-header";
  if (
    hasAny(text, [
      "cyberpunk",
      "glass",
      "glassmorphic",
      "midnight",
      "aurora",
      "neon",
      "سايبر",
      "زجاج",
      "فاخر",
      "ستايل",
      "theme",
      "design",
      "تصميم",
    ])
  ) {
    return "theme";
  }
  return null;
}

function intentFromConfig(config: UniversalStyleConfig): StyleIntent {
  if (config.effects?.sidebarCardChase) return "sidebar-chase";
  if (config.effects?.chatHeaderStyle && config.effects.chatHeaderStyle !== "none") {
    return "chat-header";
  }
  return "theme";
}

function isChaseTweakOnly(text: string): boolean {
  return (
    hasAny(text, [
      "أبطأ",
      "ابطأ",
      "أسرع",
      "اسرع",
      "slow",
      "fast",
      "أخضر",
      "أزرق",
      "ذهب",
      "بنفسج",
      "أحمر",
      "لون",
    ]) &&
    !wantsChatHeaderStyle(text) &&
    !wantsSidebarCardChaseBorder(text)
  );
}

function baseForIntentSwitch(previous: UniversalStyleConfig): UniversalStyleConfig {
  const fresh = createDefaultUniversalStyle();
  fresh.palette = { ...previous.palette };
  fresh.glass = { ...previous.glass };
  fresh.buttons = { ...previous.buttons };
  fresh.inputs = { ...previous.inputs };
  fresh.backgrounds = structuredClone(previous.backgrounds);
  fresh.themeId = previous.themeId;
  return fresh;
}

function applyChatHeaderStyle(
  base: UniversalStyleConfig,
  text: string,
): UniversalStyleConfig {
  const next = structuredClone(base);
  next.effects = {
    ...next.effects,
    sidebarCardChase: false,
    chatHeaderStyle: "flow-strip",
    chatHeaderBlurPx: clamp(next.effects?.chatHeaderBlurPx ?? 22, 12, 36),
  };

  if (hasAny(text, ["بسيط", "minimal", "هادئ", "clean"])) {
    next.effects.chatHeaderStyle = "glass-minimal";
  } else if (hasAny(text, ["ذهب", "gold", "فاخر", "luxury", "luxe"])) {
    next.effects.chatHeaderStyle = "luxe-gold";
  } else if (hasAny(text, ["نيون", "neon", "ملون", "gradient", "متدرج"])) {
    next.effects.chatHeaderStyle = "flow-strip";
  }

  if (hasAny(text, ["أفضل", "احلى", "أحلى", "مناسب", "modern", "عصري", "شكله", "شكله"])) {
    next.effects.chatHeaderBlurPx = clamp(next.effects.chatHeaderBlurPx + 4, 16, 36);
    if (next.effects.chatHeaderStyle === "none") {
      next.effects.chatHeaderStyle = "flow-strip";
    }
  }

  if (hasAny(text, ["ضباب", "blur", "زجاج"])) {
    next.effects.chatHeaderBlurPx = clamp(next.effects.chatHeaderBlurPx + 6, 12, 36);
  }

  next.label = "هيدر الشات المحسّن";
  return next;
}

function chatHeaderSummary(config: UniversalStyleConfig): string {
  const styleLabel =
    config.effects.chatHeaderStyle === "luxe-gold"
      ? "شريط ذهبي فاخر"
      : config.effects.chatHeaderStyle === "glass-minimal"
        ? "زجاج بسيط"
        : "شريط نور متحرك تحت الهيدر";
  return `${styleLabel} على الهيدر العلوي + هيدر الغرفة (blur ${config.effects.chatHeaderBlurPx}px).`;
}

function wantsSidebarCardChaseBorder(text: string): boolean {
  const hasBorderMotion = hasAny(text, [
    "شريط",
    "حدود متحر",
    "إطار متحر",
    "اطار متحر",
    "chase",
    "running light",
    "border spin",
    "rotating border",
    "animated border",
  ]);
  const hasLight = hasAny(text, [
    "نور",
    "ضوء",
    "light",
    "glow",
    "neon",
    "نيون",
    "اضاء",
    "إضاء",
    "الاضاء",
    "إنارة",
    "illumination",
  ]);
  const hasMotion = hasAny(text, [
    "يجري",
    "بيجرى",
    "بيجر",
    "يدور",
    "متحرك",
    "يلف",
    "spin",
    "rotate",
    "animate",
  ]);
  const hasAround = hasAny(text, [
    "حوالين",
    "حول",
    "around",
    "outside",
    "خارج",
    "outline",
    "border",
    "إطار",
    "اطار",
  ]);
  const hasCard = hasAny(text, ["بطاق", "بطايق", "card", "كارت"]);
  const hasSidebar = hasAny(text, [
    "عمود",
    "أعمدة",
    "اعمدة",
    "جانب",
    "sidebar",
    "side column",
    "vip",
    "راديو",
  ]);
  const rejectsInnerGlow =
    hasAny(text, ["ليس", "مش", "بدون", "not", "without"]) &&
    hasAny(text, ["انعكاس", "reflect", "reflection", "داخل", "inside", "جوا"]);

  if (hasAny(text, ["حلقة نيون", "neon ring", "شريط نور"])) return true;
  if (hasBorderMotion && (hasLight || hasMotion)) return true;
  if (hasCard && hasSidebar && (hasLight || hasMotion || hasBorderMotion || hasAround)) {
    return true;
  }
  if (hasCard && hasSidebar && rejectsInnerGlow) return true;
  if (hasAround && hasCard) return true;
  return false;
}

function wantsColumnCardsNotHeader(text: string): boolean {
  return (
    hasAny(text, ["بطاق", "بطايق", "card", "كارت"]) &&
    hasAny(text, ["عمود", "أعمدة", "اعمدة", "جانب", "vip", "راديو", "sidebar"]) &&
    !wantsChatHeaderStyle(text)
  );
}

function resolveStyleIntent(
  text: string,
  previous?: UniversalStyleConfig | null,
): StyleIntent {
  if (wantsSidebarCardChaseBorder(text)) return "sidebar-chase";
  if (wantsColumnCardsNotHeader(text)) return "sidebar-chase";
  if (wantsChatHeaderStyle(text)) return "chat-header";

  const themeIntent = detectStyleIntent(text);
  if (themeIntent) return themeIntent;

  if (
    previous &&
    intentFromConfig(previous) === "chat-header" &&
    wantsColumnCardsNotHeader(text)
  ) {
    return "sidebar-chase";
  }

  return "theme";
}

function applySidebarChaseRefinement(
  base: UniversalStyleConfig,
  text: string,
): UniversalStyleConfig {
  const next = structuredClone(base);
  next.effects = {
    ...next.effects,
    sidebarCardChase: true,
    chatHeaderStyle: "none",
  };

  if (hasAny(text, ["أبطأ", "ابطأ", "slow", "slower"])) {
    next.effects.sidebarChaseSpeedSec = clamp(next.effects.sidebarChaseSpeedSec + 2, 3, 14);
  }
  if (hasAny(text, ["أسرع", "اسرع", "fast", "faster"])) {
    next.effects.sidebarChaseSpeedSec = clamp(next.effects.sidebarChaseSpeedSec - 1.5, 3, 14);
  }
  if (hasAny(text, ["أخضر", "green", "زمرد"])) {
    next.effects.sidebarChaseTint = "#10b981";
  } else if (hasAny(text, ["أزرق", "blue", "سماوي"])) {
    next.effects.sidebarChaseTint = "#22d3ee";
  } else if (hasAny(text, ["ذهب", "gold", "أصفر"])) {
    next.effects.sidebarChaseTint = "#fbbf24";
  } else if (hasAny(text, ["بنفسج", "purple", "موف"])) {
    next.effects.sidebarChaseTint = "#a855f7";
  } else   if (hasAny(text, ["أحمر", "red", "ورد"])) {
    next.effects.sidebarChaseTint = "#ff2a5f";
  }

  if (
    hasAny(text, ["ليس", "مش", "بدون", "not"]) &&
    hasAny(text, ["انعكاس", "reflect", "داخل", "inside", "جوا"])
  ) {
    next.effects.sidebarChaseOuterOnly = true;
  }

  if (wantsSidebarCardChaseBorder(text) || wantsColumnCardsNotHeader(text)) {
    next.label = "إضاءة حول بطاقات الأعمدة";
  }
  return next;
}

function sidebarChaseSummary(config: UniversalStyleConfig): string {
  const outer =
    config.effects.sidebarChaseOuterOnly
      ? " — إضاءة خارجية حول البطاقة فقط (بدون انعكاس داخل)"
      : "";
  return `شريط نور متحرك حول بطاقات الأعمدة الجانبية (سرعة ${config.effects.sidebarChaseSpeedSec}s)${outer}.`;
}

function extractMediaUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  if (!match?.[0]) return null;
  try {
    const url = new URL(match[0]);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const normalized = url.toString();
    if (normalized.length > MAX_STYLE_URL_LENGTH) return null;
    return isSafeHttpUrl(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function detectMediaKind(url: string): StyleBackgroundKind {
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)) return "image";
  return "image";
}

function applyThemePreset(base: UniversalStyleConfig, preset: string): UniversalStyleConfig {
  const next = structuredClone(base);
  next.themeId = preset;

  if (preset === "cyberpunk-neon") {
    next.label = "سايبر نيون";
    next.palette = {
      bg: "#030712",
      surface: "rgba(12, 18, 32, 0.78)",
      accent: "#22d3ee",
      accent2: "#a855f7",
      text: "#ecfeff",
      muted: "#94a3b8",
    };
    next.glass = { blurPx: 22, opacity: 0.14, borderOpacity: 0.18 };
    next.buttons = { radiusPx: 12, glow: true, neon: true };
    next.inputs = { radiusPx: 14, borderOpacity: 0.2 };
  } else if (preset === "glassmorphic") {
    next.label = "زجاج فاخر";
    next.palette = {
      bg: "#0b1220",
      surface: "rgba(255, 255, 255, 0.08)",
      accent: "#34d399",
      accent2: "#60a5fa",
      text: "#f8fafc",
      muted: "#cbd5e1",
    };
    next.glass = { blurPx: 28, opacity: 0.18, borderOpacity: 0.22 };
    next.buttons = { radiusPx: 18, glow: false, neon: false };
    next.inputs = { radiusPx: 18, borderOpacity: 0.16 };
  } else if (preset === "midnight-luxe") {
    next.label = "ليل فاخر";
    next.palette = {
      bg: "#050505",
      surface: "rgba(20, 20, 24, 0.82)",
      accent: "#fbbf24",
      accent2: "#f59e0b",
      text: "#fafafa",
      muted: "#a1a1aa",
    };
    next.glass = { blurPx: 16, opacity: 0.1, borderOpacity: 0.12 };
    next.buttons = { radiusPx: 20, glow: true, neon: false };
  } else if (preset === "soft-aurora") {
    next.label = "أورورا هادئة";
    next.palette = {
      bg: "#0a1018",
      surface: "rgba(16, 24, 36, 0.68)",
      accent: "#10b981",
      accent2: "#3b82f6",
      text: "#f1f5f9",
      muted: "#94a3b8",
    };
    next.glass = { blurPx: 20, opacity: 0.11, borderOpacity: 0.1 };
    next.buttons = { radiusPx: 16, glow: false, neon: false };
  }

  return next;
}

function applyRefinement(base: UniversalStyleConfig, text: string): UniversalStyleConfig {
  const next = structuredClone(base);

  if (hasAny(text, ["round", "rounder", "دائري", "انحناء", "أكثر استدارة", "زر"])) {
    next.buttons.radiusPx = clamp(next.buttons.radiusPx + 4, 8, 28);
    next.inputs.radiusPx = clamp(next.inputs.radiusPx + 3, 8, 24);
  }

  if (hasAny(text, ["sharp", "square", "حاد", "مربع"])) {
    next.buttons.radiusPx = clamp(next.buttons.radiusPx - 4, 6, 28);
    next.inputs.radiusPx = clamp(next.inputs.radiusPx - 3, 6, 24);
  }

  if (hasAny(text, ["more blur", "blurrier", "ضباب", "blur", "زجاج"])) {
    next.glass.blurPx = clamp(next.glass.blurPx + 4, 8, 36);
    next.glass.opacity = clamp(next.glass.opacity + 0.02, 0.04, 0.28);
  }

  if (hasAny(text, ["less blur", "أقل ضباب"])) {
    next.glass.blurPx = clamp(next.glass.blurPx - 4, 8, 36);
  }

  // تعتيم البطاقات الزجاجية — زيادة الـ opacity
  if (hasAny(text, ["تعتيم", "اعتم", "أعتم", "عتم", "غمق الزجاج", "أغمق الزجاج", "اغمق الزجاج", "أغمق البطاقات", "opacity up", "more opacity"])) {
    next.glass.opacity = clamp(next.glass.opacity + 0.06, 0.04, 0.38);
    next.glass.borderOpacity = clamp(next.glass.borderOpacity + 0.04, 0.05, 0.4);
  }

  // زيادة الشفافية — تخفيف الـ opacity
  if (hasAny(text, ["شفافية", "اشفاف", "أشفاف", "شفاف", "شفف", "خلي الزجاج شفاف", "أقل تعتيم", "أخف", "خفف", "opacity down", "less opacity", "transparent"])) {
    next.glass.opacity = clamp(next.glass.opacity - 0.05, 0.03, 0.38);
    next.glass.borderOpacity = clamp(next.glass.borderOpacity - 0.03, 0.04, 0.4);
  }

  if (hasAny(text, ["neon", "glow", "توهج", "نيون"])) {
    next.buttons.neon = true;
    next.buttons.glow = true;
  }

  if (hasAny(text, ["no neon", "بدون نيون", "remove glow"])) {
    next.buttons.neon = false;
    next.buttons.glow = false;
  }

  if (hasAny(text, ["darker", "dark", "أغمق", "داكن"])) {
    next.palette.bg = "#030508";
    next.backgrounds.global.overlayOpacity = clamp(
      next.backgrounds.global.overlayOpacity + 0.1,
      0,
      0.65,
    );
  }

  if (hasAny(text, ["lighter", "bright", "أفتح", "فاتح"])) {
    next.palette.surface = "rgba(255,255,255,0.14)";
    next.backgrounds.global.overlayOpacity = clamp(
      next.backgrounds.global.overlayOpacity - 0.08,
      0,
      0.65,
    );
  }

  const mediaUrl = extractMediaUrl(text);
  if (mediaUrl) {
    const kind = detectMediaKind(mediaUrl);
    const layer = {
      kind,
      value: mediaUrl,
      overlayOpacity: 0.4,
      blurPx: kind === "video" ? 0 : 2,
    };
    if (hasAny(text, ["sidebar", "الجانب", "sidebar"])) {
      next.backgrounds.sidebar = layer;
    } else if (hasAny(text, ["feed", "chat", "messages", "الشات", "الرسائل"])) {
      next.backgrounds.feed = layer;
    } else {
      next.backgrounds.global = layer;
    }
  }

  return next;
}

function syncRegionToGlobalEffects(
  config: UniversalStyleConfig,
  region: ChatDesignRegion,
  r: RegionStyleState,
): void {
  if (region === "column-cards" || region === "side-columns") {
    if (r.chaseBorder) {
      config.effects.sidebarCardChase = true;
      config.effects.sidebarChaseOuterOnly = r.outerChaseOnly;
      config.effects.chatHeaderStyle = "none";
    }
  }
  if (region === "top-header") {
    if (r.flowStrip) {
      config.effects.chatHeaderStyle = "flow-strip";
      config.effects.chatHeaderBlurPx = r.blurPx;
    }
    if (r.hidden) config.effects.chatHeaderStyle = "glass-minimal";
  }
  if (region === "chat-wallpaper" || region === "chat-feed" || region === "global") {
    if (r.clean || r.removeColors) {
      config.backgrounds.global = {
        kind: "color",
        value: "#060a12",
        overlayOpacity: 0,
        blurPx: 0,
      };
      config.backgrounds.feed = {
        kind: "color",
        value: "transparent",
        overlayOpacity: 0,
        blurPx: 0,
      };
      config.palette.bg = "#060a12";
    }
    if (r.darken > 0) {
      config.backgrounds.global.overlayOpacity = clamp(
        config.backgrounds.global.overlayOpacity + r.darken,
        0,
        0.75,
      );
    }
  }
  if (region === "composer" && r.darken > 0) {
    config.glass.opacity = clamp(config.glass.opacity + 0.05, 0.04, 0.32);
  }
}

function applyDesignCommand(
  base: UniversalStyleConfig,
  cmd: DetectedDesignCommand,
  text: string,
): UniversalStyleConfig {
  const next = structuredClone(base);
  next.regions = next.regions || createDefaultRegions();
  const r: RegionStyleState = { ...next.regions[cmd.region] };

  const actions: RegionAction[] =
    cmd.actions.length > 0 ? cmd.actions : ["clean"];

  for (const action of actions) {
    switch (action) {
      case "darken":
        r.darken = clamp(r.darken + 0.14, 0, 0.7);
        break;
      case "lighten":
        r.darken = clamp(r.darken - 0.14, 0, 0.7);
        break;
      case "clean":
        r.clean = true;
        break;
      case "remove-colors":
        r.removeColors = true;
        r.clean = true;
        break;
      case "flow-strip":
        r.flowStrip = true;
        break;
      case "chase-border":
        r.chaseBorder = true;
        break;
      case "more-blur":
      case "glass":
        r.blurPx = clamp(r.blurPx + 6, 8, 40);
        break;
      case "hide":
        r.hidden = true;
        break;
    }
  }

  if (
    hasAny(text, ["ليس", "مش", "بدون", "not"]) &&
    hasAny(text, ["انعكاس", "داخل", "reflect", "inside"])
  ) {
    r.outerChaseOnly = true;
  }

  next.regions[cmd.region] = r;
  syncRegionToGlobalEffects(next, cmd.region, r);
  next.label = cmd.regionLabelAr;
  return next;
}

/** Parse owner natural language into a compiled style config (with optional refinement memory). */
export function parseOwnerStylePrompt(
  prompt: string,
  previous?: UniversalStyleConfig | null,
): StyleEngineParseResult {
  const trimmed = prompt.trim();

  if (hasAny(trimmed, ["مساعدة", "مصطلحات", "help", "افهم ايه", "القاموس", "مصطلح"])) {
    return {
      config: previous ? structuredClone(previous) : createDefaultUniversalStyle(),
      summary: DESIGN_VOCABULARY_HINT,
      refined: false,
    };
  }

  if (isDesignSuggestionPrompt(trimmed)) {
    const config = previous ? structuredClone(previous) : createDefaultUniversalStyle();
    const suggestions = buildDesignInspectSuggestions(config, null, 6);
    return {
      config,
      summary: formatDesignSuggestionsSummary(suggestions),
      refined: false,
    };
  }

  if (isDesignImportPrompt(trimmed)) {
    const imported =
      typeof window !== "undefined" ? loadImportedDesignPacks() : [];
    const matched = matchImportPackFromPrompt(trimmed, imported);
    if (matched) {
      const config = buildPackStyleConfig(matched);
      return {
        config,
        summary: `📦 ${describeImportPackApply(matched)}\n\n👀 ألوان «${config.label}» — افتح مكتبة الثيمات للمعاينة المعزولة، أو «تطبيق على الكل» للحفظ.`,
        refined: false,
        importPack: matched,
      };
    }
    return {
      config: previous
        ? structuredClone(previous)
        : createDefaultUniversalStyle(),
      summary: formatDesignImportLibrarySummary(imported),
      refined: false,
    };
  }

  if (isWallpaperResetPrompt(trimmed)) {
    const base = previous ? structuredClone(previous) : createDefaultUniversalStyle();
    return {
      config: resetConfigWallpaperToDefault(base),
      summary:
        "↩️ رجوع للخلفية الافتراضية (/MAN.png) — اضغط «تطبيق على الكل» للحفظ أو «إلغاء» للتراجع.",
      refined: false,
    };
  }

  const designCmd = detectDesignRegion(trimmed);
  if (designCmd && designCmd.regionScore >= 2) {
    const base = previous ? structuredClone(previous) : createDefaultUniversalStyle();
    const config = applyDesignCommand(base, designCmd, trimmed);
    config.promptHistory = [...(config.promptHistory || []), trimmed].slice(-12);
    const actionText =
      designCmd.actionLabelsAr.length > 0
        ? designCmd.actionLabelsAr.join(" + ")
        : "تعديل الشكل";
    return {
      config,
      summary: `🎯 ${designCmd.regionLabelAr} → ${actionText}`,
      refined: Boolean(previous),
    };
  }

  const newIntent = resolveStyleIntent(trimmed, previous);
  const prevIntent = previous ? intentFromConfig(previous) : null;
  const intentSwitch =
    Boolean(previous) &&
    prevIntent !== null &&
    newIntent !== prevIntent;

  const pickBase = (): UniversalStyleConfig => {
    if (intentSwitch && previous) return baseForIntentSwitch(previous);
    if (previous) return structuredClone(previous);
    return createDefaultUniversalStyle();
  };

  // ── Sidebar chase (new request or speed/color tweak only) ──
  if (newIntent === "sidebar-chase" || (previous?.effects?.sidebarCardChase && isChaseTweakOnly(trimmed))) {
    const config = applySidebarChaseRefinement(pickBase(), trimmed);
    config.promptHistory = [...(config.promptHistory || []), trimmed].slice(-12);
    return {
      config,
      summary: intentSwitch
        ? `طلب جديد: ${sidebarChaseSummary(config)}`
        : sidebarChaseSummary(config),
      refined: !intentSwitch && Boolean(previous),
    };
  }

  // ── Chat header (new intent — clears sidebar chase) ──
  if (newIntent === "chat-header") {
    const config = applyChatHeaderStyle(pickBase(), trimmed);
    config.promptHistory = [...(config.promptHistory || []), trimmed].slice(-12);
    return {
      config,
      summary: intentSwitch
        ? `طلب جديد: ${chatHeaderSummary(config)}`
        : chatHeaderSummary(config),
      refined: !intentSwitch && Boolean(previous),
    };
  }

  let config = pickBase();
  const isRefinementOnly =
    hasAny(trimmed, [
      "round",
      "rounder",
      "blur",
      "neon",
      "darker",
      "lighter",
      "أغمق",
      "أفتح",
      "دائري",
      "ضباب",
      "نيون",
      "http",
    ]) &&
    !hasAny(trimmed, ["cyberpunk", "glass", "glassmorphic", "midnight", "aurora", "سايبر"]);

  if (previous && isRefinementOnly && !intentSwitch) {
    config = applyRefinement(config, trimmed);
    config.promptHistory = [...(config.promptHistory || []), trimmed].slice(-12);
    return {
      config,
      summary: `تم تحديث المعاينة بناءً على: «${trimmed.slice(0, 80)}»`,
      refined: true,
    };
  }

  // New generic request while stuck on chase/header → reset effects, apply theme
  if (intentSwitch && previous) {
    config.effects.sidebarCardChase = false;
    config.effects.chatHeaderStyle = "none";
  }

  if (hasAny(trimmed, ["cyberpunk", "neon", "سايبر", "نيون", "مستقبل"])) {
    config = applyThemePreset(config, "cyberpunk-neon");
  } else if (hasAny(trimmed, ["glass", "glassmorphic", "زجاج", "frosted", "شفاف"])) {
    config = applyThemePreset(config, "glassmorphic");
  } else if (hasAny(trimmed, ["midnight", "luxe", "luxury", "فاخر", "ذهب"])) {
    config = applyThemePreset(config, "midnight-luxe");
  } else if (hasAny(trimmed, ["aurora", "soft", "هادئ", "calm"])) {
    config = applyThemePreset(config, "soft-aurora");
  }

  config = applyRefinement(config, trimmed);

  const hasThemeKeyword = hasAny(trimmed, [
    "cyberpunk",
    "glass",
    "glassmorphic",
    "midnight",
    "aurora",
    "neon",
    "سايبر",
    "زجاج",
    "فاخر",
    "http",
  ]);

  if (!hasThemeKeyword && !previous && !isRefinementOnly) {
    if (
      hasAny(trimmed, [
        "حلو",
        "جميل",
        "فخم",
        "روع",
        "premium",
        "fabulous",
        "modern",
        "عصري",
        "مودرن",
      ])
    ) {
      config = applyThemePreset(config, "glassmorphic");
    } else if (hasAny(trimmed, ["مظلم", "داكن", "dark", "ليل"])) {
      config = applyThemePreset(config, "midnight-luxe");
    } else if (hasAny(trimmed, ["نيون", "neon", "مستقبل", "سايبر"])) {
      config = applyThemePreset(config, "cyberpunk-neon");
    } else if (hasAny(trimmed, ["هادئ", "calm", "soft", "aurora"])) {
      config = applyThemePreset(config, "soft-aurora");
    } else {
      config = applyThemePreset(config, "glassmorphic");
      config.label = "تصميم مخصص";
    }
  }

  config.promptHistory = [...(config.promptHistory || []), trimmed].slice(-12);

  return {
    config,
    summary: intentSwitch
      ? `طلب جديد: جهّزت ستايل «${config.label}» من: «${trimmed.slice(0, 80)}»`
      : previous
        ? `تم تعديل ستايل «${config.label}» حسب طلبك الأخير.`
        : `جهّزت ستايل «${config.label}» من طلبك: «${trimmed.slice(0, 80)}»`,
    refined: Boolean(previous) && !intentSwitch,
  };
}

/** In dedicated owner design room, every message (except /commands) is a style prompt. */
export function isOwnerStylePrompt(text: string, inOwnerDesignRoom = false): boolean {
  const t = text.trim();
  if (!t || t.startsWith("/")) return false;
  if (inOwnerDesignRoom) return true;

  const styleHints = [
    "style",
    "design",
    "theme",
    "look",
    "background",
    "glass",
    "neon",
    "cyber",
    "تصميم",
    "ستايل",
    "شكل",
    "خلفية",
    "زجاج",
    "نيون",
    "لون",
    "button",
    "round",
    "blur",
    "http",
    "fabulous",
    "premium",
    "معاينة",
    "مظهر",
    "ألوان",
    "الوان",
    "أزرار",
    "ازرار",
    "حلو",
    "جميل",
    "فخم",
    "موقع",
    "شاشة",
    "بوت",
  ];
  return styleHints.some((h) => t.toLowerCase().includes(h.toLowerCase()));
}
