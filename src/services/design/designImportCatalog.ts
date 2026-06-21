import type { DesignAssistantProposalId } from "../../lib/chatTypes";
import type { GlassFormId } from "./glassTransparencyService";
import type { ColumnCardStyleId } from "./columnCardStyleService";

export type DesignImportCategory =
  | "colors"
  | "uiverse"
  | "ios"
  | "glass-card"
  | "columns"
  | "theme";

export interface DesignImportPack {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  category: DesignImportCategory;
  tags: string[];
  previewGradient: string;
  sourceUrl?: string;
  glassFormId?: GlassFormId;
  columnCardStyleId?: ColumnCardStyleId;
  templateId?: DesignAssistantProposalId;
  /** Legacy NLP fallback — prefer frozen palette in designPackStylePresets */
  stylePrompt?: string;
  tintHex?: string;
  bundlePath?: string;
}

export const DESIGN_IMPORT_CATEGORY_LABELS: Record<DesignImportCategory, string> = {
  colors: "🎨 ألوان الشات",
  uiverse: "✨ UIverse",
  ios: "🍎 iOS",
  "glass-card": "🪟 زجاج",
  columns: "📐 بطاقات",
  theme: "📦 ثيم كامل",
};

/** Curated packs — palette in designPackStylePresets.ts (not tint-over-current) */
export const BUILTIN_DESIGN_IMPORT_PACKS: DesignImportPack[] = [
  {
    id: "colors-midnight-blue",
    title: "منتصف الليل",
    subtitle: "أزرق عميق — ألوان الشات فقط",
    emoji: "🌙",
    category: "colors",
    tags: ["ألوان", "أزرق"],
    previewGradient: "linear-gradient(145deg, #0c1222, #1e3a8a, #3b82f6)",
    tintHex: "#3b82f6",
  },
  {
    id: "colors-rose-blush",
    title: "وردي ناعم",
    subtitle: "زهري دافئ — فقاعات وردية",
    emoji: "🌸",
    category: "colors",
    tags: ["ألوان", "وردي"],
    previewGradient: "linear-gradient(145deg, #1a0a12, #be185d, #f472b6)",
    tintHex: "#f472b6",
  },
  {
    id: "colors-amber-warm",
    title: "دفء عنبري",
    subtitle: "ذهبي دافئ — مريح للعين",
    emoji: "🔥",
    category: "colors",
    tags: ["ألوان", "عنبر"],
    previewGradient: "linear-gradient(145deg, #1c1208, #b45309, #fbbf24)",
    tintHex: "#f59e0b",
  },
  {
    id: "uiverse-neon-glow",
    title: "Neon Glow",
    subtitle: "أزرار نيون — مستوحى من UIverse",
    emoji: "💠",
    category: "uiverse",
    tags: ["uiverse", "neon"],
    previewGradient: "linear-gradient(145deg, #050508, #00f5ff, #ff00aa)",
    glassFormId: "smoke-dark",
    columnCardStyleId: "sharp",
    tintHex: "#00f5ff",
  },
  {
    id: "uiverse-gradient-sunset",
    title: "Gradient Sunset",
    subtitle: "أزرار capsule — برتقالي ووردي",
    emoji: "🌅",
    category: "uiverse",
    tags: ["uiverse", "gradient"],
    previewGradient: "linear-gradient(145deg, #1a0f1e, #f97316, #ec4899)",
    columnCardStyleId: "pill",
    tintHex: "#f97316",
  },
  {
    id: "uiverse-glass-morph",
    title: "Glass Morph",
    subtitle: "زجاج شفاف + بنفسجي",
    emoji: "🔮",
    category: "uiverse",
    tags: ["uiverse", "glass"],
    previewGradient: "linear-gradient(145deg, #0f172a, #4c1d95, #8b5cf6)",
    glassFormId: "ultra-clear",
    columnCardStyleId: "frosted",
    tintHex: "#8b5cf6",
  },
  {
    id: "uiverse-morph-dark",
    title: "Morph Dark",
    subtitle: "داكن مع توهج بنفسجي",
    emoji: "🌌",
    category: "uiverse",
    tags: ["uiverse", "dark"],
    previewGradient: "linear-gradient(145deg, #09090b, #581c87, #a855f7)",
    glassFormId: "ghost",
    columnCardStyleId: "minimal",
    tintHex: "#a855f7",
  },
  {
    id: "ios-liquid-glass",
    title: "Liquid Glass iOS 18",
    subtitle: "زجاج سائل + بطاقات sheet",
    emoji: "🫧",
    category: "ios",
    tags: ["iOS", "liquid"],
    previewGradient: "linear-gradient(145deg, #0a1628 0%, #6366f1 45%, #c4b5fd 100%)",
    bundlePath: "/design-packs/ios-liquid-glass.json",
    glassFormId: "ios-liquid",
    columnCardStyleId: "ios-sheet",
    tintHex: "#818cf8",
  },
  {
    id: "ios-vibrancy-dark",
    title: "Vibrancy داكن",
    subtitle: "Control Center — blur عميق",
    emoji: "🌑",
    category: "ios",
    tags: ["iOS", "dark"],
    previewGradient: "linear-gradient(145deg, #030712 0%, #1e293b 50%, #475569 100%)",
    bundlePath: "/design-packs/ios-vibrancy-dark.json",
    glassFormId: "ios-vibrancy",
    columnCardStyleId: "ios-inset",
    tintHex: "#64748b",
  },
  {
    id: "ios-widget-light",
    title: "Widget فاتح",
    subtitle: "Home Screen فاتح",
    emoji: "📱",
    category: "ios",
    tags: ["iOS", "light"],
    previewGradient: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 40%, #94a3b8 100%)",
    glassFormId: "ios-widget",
    columnCardStyleId: "soft-round",
    tintHex: "#6366f1",
  },
  {
    id: "glass-crystal-luxury",
    title: "كريستال فاخر",
    subtitle: "زجاج مرآة + بطاقات VIP",
    emoji: "💎",
    category: "glass-card",
    tags: ["زجاج", "VIP"],
    previewGradient: "linear-gradient(145deg, #1a1208, #d4a63a, #f7e7b4)",
    glassFormId: "mirror",
    columnCardStyleId: "crystal",
    templateId: "premium",
    tintHex: "#fbbf24",
  },
  {
    id: "glass-frosted-ocean",
    title: "Frosted محيط",
    subtitle: "ضبابية زrقاء — قراءة مريحة",
    emoji: "🌊",
    category: "glass-card",
    tags: ["frosted", "ocean"],
    previewGradient: "linear-gradient(145deg, #060d18, #0ea5e9, #bae6fd)",
    glassFormId: "ultra-clear",
    columnCardStyleId: "frosted",
    templateId: "calm",
    tintHex: "#38bdf8",
  },
  {
    id: "columns-neon-focus",
    title: "حلقة نيون",
    subtitle: "إطار متحرك + ألوان خضراء",
    emoji: "⚡",
    category: "columns",
    tags: ["أعمدة", "نيون"],
    previewGradient: "linear-gradient(145deg, #041016, #10b981, #6ee7b7)",
    columnCardStyleId: "neon-ring",
    templateId: "layout-chat-focus",
    tintHex: "#10b981",
  },
  {
    id: "columns-liquid-ring",
    title: "Liquid Ring",
    subtitle: "إضاءة سائلة بنفسجية",
    emoji: "💫",
    category: "columns",
    tags: ["liquid", "VIP"],
    previewGradient: "linear-gradient(145deg, #0f0a1a, #a855f7, #ec4899)",
    columnCardStyleId: "liquid-ring",
    glassFormId: "ios-liquid",
    tintHex: "#c084fc",
  },
  {
    id: "decor-geometric-tech",
    title: "هندسي تقني",
    subtitle: "زوايا حادة + وجه هندسي",
    emoji: "◆",
    category: "theme",
    tags: ["هندسي", "تقني"],
    previewGradient: "linear-gradient(145deg, #0a0f16, #14b8a6, #2dd4bf)",
    columnCardStyleId: "sharp",
    glassFormId: "crystal",
    templateId: "geometric",
    tintHex: "#2dd4bf",
  },
  {
    id: "theme-cyber-neon",
    title: "Cyber Neon",
    subtitle: "سايبر + نيون كامل",
    emoji: "🌃",
    category: "theme",
    tags: ["cyberpunk", "neon"],
    previewGradient: "linear-gradient(145deg, #0a0014, #ff00ff, #00ffff)",
    glassFormId: "smoke-dark",
    columnCardStyleId: "neon-ring",
    tintHex: "#22d3ee",
  },
  {
    id: "theme-emerald-lamma",
    title: "لمة Emerald",
    subtitle: "هوية لمة الرسمية",
    emoji: "✨",
    category: "theme",
    tags: ["لامة", "emerald"],
    previewGradient: "linear-gradient(145deg, #060a12, #10b981, #6ee7b7)",
    templateId: "identity-refresh",
    glassFormId: "classic",
    columnCardStyleId: "frosted",
    tintHex: "#10b981",
  },
];

export function getImportPacksByCategory(
  category: DesignImportCategory,
  extra: DesignImportPack[] = [],
): DesignImportPack[] {
  const merged = [...BUILTIN_DESIGN_IMPORT_PACKS, ...extra];
  const seen = new Set<string>();
  return merged.filter((pack) => {
    if (pack.category !== category || seen.has(pack.id)) return false;
    seen.add(pack.id);
    return true;
  });
}

export function findImportPackById(
  id: string,
  extra: DesignImportPack[] = [],
): DesignImportPack | undefined {
  return [...extra, ...BUILTIN_DESIGN_IMPORT_PACKS].find((p) => p.id === id);
}

export function isDesignImportPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  const terms = [
    "استورد",
    "import",
    "uiverse",
    "liquid glass",
    "مكتبة ثيم",
    "مكتبة التصميم",
    "من النت",
    "from url",
  ];
  return terms.some((t) => lower.includes(t));
}
