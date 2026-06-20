import type { DesignAssistantProposalId } from "../../lib/chatTypes";
import type { GlassFormId } from "./glassTransparencyService";
import type { ColumnCardStyleId } from "./columnCardStyleService";

export type DesignImportCategory =
  | "ios"
  | "theme"
  | "glass-card"
  | "columns"
  | "decor";

export interface DesignImportPack {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  category: DesignImportCategory;
  tags: string[];
  previewGradient: string;
  /** Optional remote JSON source (https only) */
  sourceUrl?: string;
  glassFormId?: GlassFormId;
  columnCardStyleId?: ColumnCardStyleId;
  templateId?: DesignAssistantProposalId;
  /** Universal style engine prompt */
  stylePrompt?: string;
  tintHex?: string;
  /** Bundled pack path on this site */
  bundlePath?: string;
}

export const DESIGN_IMPORT_CATEGORY_LABELS: Record<DesignImportCategory, string> = {
  ios: "iOS المظهر الخلاب",
  theme: "ثيمات كاملة",
  "glass-card": "بطاقات زجاجية",
  columns: "أعمدة وتقسيم",
  decor: "تجميل وزخرفة",
};

/** Curated packs — tuned for Lamma Chat (RTL Arabic chat) */
export const BUILTIN_DESIGN_IMPORT_PACKS: DesignImportPack[] = [
  {
    id: "ios-liquid-glass",
    title: "Liquid Glass iOS 18",
    subtitle: "زجاج سائل + vibrancy — مثل iOS الحديث",
    emoji: "🫧",
    category: "ios",
    tags: ["iOS", "liquid", "2024"],
    previewGradient: "linear-gradient(145deg, #0a1628 0%, #6366f1 45%, #c4b5fd 100%)",
    bundlePath: "/design-packs/ios-liquid-glass.json",
    glassFormId: "ios-liquid",
    columnCardStyleId: "ios-sheet",
    stylePrompt: "fabulous glassmorphic look ios liquid glass emerald calm",
    tintHex: "#a5b4fc",
  },
  {
    id: "ios-vibrancy-dark",
    title: "Vibrancy داكن",
    subtitle: "مظهر iOS Control Center — blur عميق",
    emoji: "🌑",
    category: "ios",
    tags: ["iOS", "dark", "vibrancy"],
    previewGradient: "linear-gradient(145deg, #030712 0%, #1e293b 50%, #475569 100%)",
    bundlePath: "/design-packs/ios-vibrancy-dark.json",
    glassFormId: "ios-vibrancy",
    columnCardStyleId: "ios-inset",
    stylePrompt: "glass minimal dark ios style calm readability",
    tintHex: "#94a3b8",
  },
  {
    id: "ios-widget-light",
    title: "Widget فاتح",
    subtitle: "بطاقات iOS Home Screen — ناعمة ومضيئة",
    emoji: "📱",
    category: "ios",
    tags: ["iOS", "widget", "light"],
    previewGradient: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 40%, #94a3b8 100%)",
    glassFormId: "ios-widget",
    columnCardStyleId: "soft-round",
    stylePrompt: "light glass soft round buttons ios widget style",
    tintHex: "#e2e8f0",
  },
  {
    id: "glass-crystal-luxury",
    title: "كريستال فاخر",
    subtitle: "زجاج + بطاقات VIP لامعة",
    emoji: "💎",
    category: "glass-card",
    tags: ["زجاج", "VIP", "فخامة"],
    previewGradient: "linear-gradient(145deg, #1a1208, #d4a63a, #f7e7b4)",
    glassFormId: "mirror",
    columnCardStyleId: "crystal",
    templateId: "premium",
    tintHex: "#fbbf24",
  },
  {
    id: "glass-frosted-ocean",
    title: "Frosted محيط",
    subtitle: "ضبابية زرقاء — قراءة مريحة",
    emoji: "🌊",
    category: "glass-card",
    tags: ["frosted", "ocean", "هدوء"],
    previewGradient: "linear-gradient(145deg, #060d18, #0ea5e9, #bae6fd)",
    glassFormId: "ultra-clear",
    columnCardStyleId: "frosted",
    templateId: "calm",
    tintHex: "#38bdf8",
  },
  {
    id: "columns-neon-focus",
    title: "أعمدة نيون + تركيز شات",
    subtitle: "حلقة نيون على البطاقات + مساحة شات أوسع",
    emoji: "⚡",
    category: "columns",
    tags: ["أعمدة", "نيون", "شات"],
    previewGradient: "linear-gradient(145deg, #041016, #10b981, #6ee7b7)",
    columnCardStyleId: "neon-ring",
    templateId: "layout-chat-focus",
    stylePrompt: "شريط نور حوالين بطاقات الأعمدة",
    tintHex: "#10b981",
  },
  {
    id: "columns-liquid-ring",
    title: "Liquid Ring",
    subtitle: "إضاءة سائلة حول بطاقات VIP",
    emoji: "💫",
    category: "columns",
    tags: ["liquid", "VIP", "iOS"],
    previewGradient: "linear-gradient(145deg, #0f0a1a, #a855f7, #ec4899)",
    columnCardStyleId: "liquid-ring",
    glassFormId: "ios-liquid",
    stylePrompt: "sidebar card chase green slower ios liquid",
    tintHex: "#c084fc",
  },
  {
    id: "decor-geometric-tech",
    title: "هندسي تقني",
    subtitle: "زوايا حادة + وجه هندسي",
    emoji: "◆",
    category: "decor",
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
    subtitle: "ثيم سايبر + نيون للشات العربي",
    emoji: "🌃",
    category: "theme",
    tags: ["cyberpunk", "neon", "ليلي"],
    previewGradient: "linear-gradient(145deg, #0a0014, #ff00ff, #00ffff)",
    stylePrompt: "make the site cyberpunk neon glass dark",
    glassFormId: "smoke-dark",
    columnCardStyleId: "neon-ring",
    tintHex: "#22d3ee",
  },
  {
    id: "theme-emerald-lamma",
    title: "لمة Emerald",
    subtitle: "هوية لمة الرسمية — متوازن وجاهز",
    emoji: "✨",
    category: "theme",
    tags: ["لامة", "emerald", "brand"],
    previewGradient: "linear-gradient(145deg, #060a12, #10b981, #6ee7b7)",
    templateId: "identity-refresh",
    glassFormId: "classic",
    columnCardStyleId: "frosted",
    stylePrompt: "fabulous glassmorphic look emerald calm",
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
    "ios glass",
    "liquid glass",
    "مظهر ios",
    "ثيم ios",
    "بطاقة زجاج",
    "مكتبة التصميم",
    "مكتبة ثيم",
    "من النت",
    "from url",
  ];
  return terms.some((t) => lower.includes(t));
}
