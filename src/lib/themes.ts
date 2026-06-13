// Theme presets for the Lamma Chat app. Each theme defines a full
// set of CSS variables that get applied at runtime via the useTheme hook.
// Note: inside ChatScreen, the production shell currently wraps the UI
// with `.lamma-neutral-glass`, so the live in-chat appearance remains
// intentionally closer to the neutral/golden deployed design.
//
// Adding a new preset:
//   1) Add a new entry to PRESETS below.
//   2) Make sure every property (primary, accent, bg1, bg2, text, glow)
//      is filled. The UI uses these for the live preview.

export interface ThemePalette {
  /** Primary accent (main buttons, highlights, online indicator). */
  primary: string;
  /** Secondary accent (chips, subtle highlights, secondary glows). */
  accent: string;
  /** Deepest background (page bottom, behind everything). */
  bg1: string;
  /** Mid background (cards, modals). */
  bg2: string;
  /** Surface background (inputs, surfaces). */
  bg3: string;
  /** Primary text color. */
  text: string;
  /** Muted text color. */
  textMuted: string;
  /** RGB triple for the primary color, used for rgba() glow effects. */
  primaryRgb: string;
  /** RGB triple for the accent color, used for rgba() glow effects. */
  accentRgb: string;
}

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  palette: ThemePalette;
  isCustom?: boolean;
}

// Helper: convert a hex color to its "r, g, b" string for rgba() use.
function rgbFromHex(hex: string): string {
  const raw = hex.replace("#", "").trim();
  const value =
    raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (value.length !== 6) return "16, 185, 129";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function p(hex: string): ThemePalette {
  return {
    primary: hex,
    accent: hex,
    bg1: "#0a0f0c",
    bg2: "#0c120d",
    bg3: "#0e1810",
    text: "#ffffff",
    textMuted: "#9ca3af",
    primaryRgb: rgbFromHex(hex),
    accentRgb: rgbFromHex(hex),
  };
}

export const PRESETS: Theme[] = [
  {
    id: "lamma",
    name: "لامة الأصلي",
    emoji: "💚",
    palette: {
      primary: "#10b981",
      accent: "#a3e635",
      bg1: "#0a0f0c",
      bg2: "#0c120d",
      bg3: "#0e1810",
      text: "#ffffff",
      textMuted: "#9ca3af",
      primaryRgb: rgbFromHex("#10b981"),
      accentRgb: rgbFromHex("#a3e635"),
    },
  },
  {
    id: "amoled",
    name: "AMOLED أسود نقي",
    emoji: "🖤",
    palette: {
      primary: "#22c55e",
      accent: "#4ade80",
      bg1: "#000000",
      bg2: "#050505",
      bg3: "#0a0a0a",
      text: "#ffffff",
      textMuted: "#9ca3af",
      primaryRgb: rgbFromHex("#22c55e"),
      accentRgb: rgbFromHex("#4ade80"),
    },
  },
  {
    id: "ocean",
    name: "أزرق المحيط",
    emoji: "🌊",
    palette: {
      primary: "#0ea5e9",
      accent: "#06b6d4",
      bg1: "#020617",
      bg2: "#0a1628",
      bg3: "#0c1d33",
      text: "#ffffff",
      textMuted: "#94a3b8",
      primaryRgb: rgbFromHex("#0ea5e9"),
      accentRgb: rgbFromHex("#06b6d4"),
    },
  },
  {
    id: "royal",
    name: "بنفسجي ملكي",
    emoji: "👑",
    palette: {
      primary: "#a855f7",
      accent: "#d946ef",
      bg1: "#0a0612",
      bg2: "#150a26",
      bg3: "#1c0f33",
      text: "#ffffff",
      textMuted: "#c4b5fd",
      primaryRgb: rgbFromHex("#a855f7"),
      accentRgb: rgbFromHex("#d946ef"),
    },
  },
  {
    id: "sunset",
    name: "برتقالي الغروب",
    emoji: "🌅",
    palette: {
      primary: "#f97316",
      accent: "#facc15",
      bg1: "#0c0a05",
      bg2: "#1a1109",
      bg3: "#261711",
      text: "#ffffff",
      textMuted: "#fde68a",
      primaryRgb: rgbFromHex("#f97316"),
      accentRgb: rgbFromHex("#facc15"),
    },
  },
  {
    id: "rose",
    name: "وردي فخم",
    emoji: "🌸",
    palette: {
      primary: "#ec4899",
      accent: "#fb7185",
      bg1: "#0c0810",
      bg2: "#1a0f1a",
      bg3: "#261426",
      text: "#ffffff",
      textMuted: "#fda4af",
      primaryRgb: rgbFromHex("#ec4899"),
      accentRgb: rgbFromHex("#fb7185"),
    },
  },
  {
    id: "cyberpunk",
    name: "سايبربانك",
    emoji: "🤖",
    palette: {
      primary: "#f0abfc",
      accent: "#22d3ee",
      bg1: "#040404",
      bg2: "#0a0a14",
      bg3: "#11111c",
      text: "#ffffff",
      textMuted: "#94a3b8",
      primaryRgb: rgbFromHex("#f0abfc"),
      accentRgb: rgbFromHex("#22d3ee"),
    },
  },
  {
    id: "gold",
    name: "ذهبي VIP",
    emoji: "✨",
    palette: {
      primary: "#eab308",
      accent: "#fbbf24",
      bg1: "#0a0a05",
      bg2: "#1a1505",
      bg3: "#261d0a",
      text: "#ffffff",
      textMuted: "#fde68a",
      primaryRgb: rgbFromHex("#eab308"),
      accentRgb: rgbFromHex("#fbbf24"),
    },
  },
  {
    id: "forest",
    name: "غابة خضراء",
    emoji: "🌲",
    palette: {
      primary: "#16a34a",
      accent: "#84cc16",
      bg1: "#021008",
      bg2: "#052016",
      bg3: "#0a2a1c",
      text: "#ffffff",
      textMuted: "#bef264",
      primaryRgb: rgbFromHex("#16a34a"),
      accentRgb: rgbFromHex("#84cc16"),
    },
  },
  {
    id: "lavender",
    name: "لافندر هادي",
    emoji: "💜",
    palette: {
      primary: "#8b5cf6",
      accent: "#c4b5fd",
      bg1: "#0a0712",
      bg2: "#15101f",
      bg3: "#1f1830",
      text: "#ffffff",
      textMuted: "#c4b5fd",
      primaryRgb: rgbFromHex("#8b5cf6"),
      accentRgb: rgbFromHex("#c4b5fd"),
    },
  },
  {
    id: "side-column-glass",
    name: "زجاج الأعمدة",
    emoji: "🪞",
    palette: {
      primary: "#e8d7a8",
      accent: "#f7e7b4",
      bg1: "#0b1017",
      bg2: "#121924",
      bg3: "#192230",
      text: "#f8fafc",
      textMuted: "#cbd5e1",
      primaryRgb: rgbFromHex("#e8d7a8"),
      accentRgb: rgbFromHex("#f7e7b4"),
    },
  },
];

export const DEFAULT_THEME = PRESETS[0];

export const CUSTOM_THEME_ID = "custom";

export function buildCustomTheme(palette: Partial<ThemePalette>): Theme {
  const base = DEFAULT_THEME.palette;
  const merged: ThemePalette = { ...base, ...palette };
  return {
    id: CUSTOM_THEME_ID,
    name: "خصيص ليك",
    emoji: "🎨",
    palette: merged,
    isCustom: true,
  };
}

export { p as paletteFromHex, rgbFromHex };
