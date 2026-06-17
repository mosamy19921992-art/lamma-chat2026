import type { DesignAssistantProposalId } from "../../lib/chatTypes";

export type DesignReadyTemplate = {
  id: DesignAssistantProposalId;
  title: string;
  subtitle: string;
  emoji: string;
  impact: "خفيف" | "متوسط" | "قوي";
  tags: string[];
  previewGradient: string;
};

/** Ready-made design cards for the owner design assistant gallery. */
export const READY_DESIGN_TEMPLATES: DesignReadyTemplate[] = [
  {
    id: "premium",
    title: "الفخامة الذهبية",
    subtitle: "هوية قوية ولمسة VIP",
    emoji: "👑",
    impact: "متوسط",
    tags: ["هوية", "فخامة"],
    previewGradient:
      "linear-gradient(145deg, #1a1208 0%, #d4a63a 45%, #f7e7b4 100%)",
  },
  {
    id: "calm",
    title: "هدوء المحيط",
    subtitle: "قراءة مريحة وتركيز أعلى",
    emoji: "🌊",
    impact: "خفيف",
    tags: ["راحة", "وضوح"],
    previewGradient:
      "linear-gradient(145deg, #060d18 0%, #0ea5e9 50%, #bae6fd 100%)",
  },
  {
    id: "night",
    title: "الليل العميق",
    subtitle: "شخصية ليلية حديثة",
    emoji: "🌙",
    impact: "متوسط",
    tags: ["ليلي", "هوية"],
    previewGradient:
      "linear-gradient(145deg, #030712 0%, #312e81 55%, #6366f1 100%)",
  },
  {
    id: "geometric",
    title: "الوجه الهندسي",
    subtitle: "زوايا حادة وطابع تقني",
    emoji: "◆",
    impact: "متوسط",
    tags: ["شكل", "تقسيم"],
    previewGradient:
      "linear-gradient(145deg, #0a0f16 0%, #14b8a6 40%, #2dd4bf 100%)",
  },
  {
    id: "immersive",
    title: "غمر الغرفة",
    subtitle: "بصمة بصرية للغرفة الحالية",
    emoji: "🎭",
    impact: "قوي",
    tags: ["غرفة", "خلفية"],
    previewGradient:
      "linear-gradient(145deg, #150606 0%, #ef4444 45%, #fca5a5 100%)",
  },
  {
    id: "identity-refresh",
    title: "تحديث الهوية",
    subtitle: "شعار + خلفية عامة موحّدة",
    emoji: "✨",
    impact: "متوسط",
    tags: ["براند", "اتساق"],
    previewGradient:
      "linear-gradient(145deg, #0a1628 0%, #10b981 50%, #6ee7b7 100%)",
  },
  {
    id: "room-focus",
    title: "تركيز الغرفة",
    subtitle: "ضبط سريع للغرفة المفتوحة",
    emoji: "🎯",
    impact: "خفيف",
    tags: ["غرفة", "سريع"],
    previewGradient:
      "linear-gradient(145deg, #0a060f 0%, #a855f7 50%, #e9d5ff 100%)",
  },
  {
    id: "layout-balance",
    title: "توازن الأعمدة",
    subtitle: "تقسيم متوازن للوحة الشات",
    emoji: "⚖️",
    impact: "خفيف",
    tags: ["تقسيم", "توازن"],
    previewGradient:
      "linear-gradient(145deg, #080a0c 0%, #64748b 50%, #e2e8f0 100%)",
  },
  {
    id: "layout-chat-focus",
    title: "تركيز الشات",
    subtitle: "مساحة أكبر لمنطقة المحادثة",
    emoji: "💬",
    impact: "متوسط",
    tags: ["شات", "مساحة"],
    previewGradient:
      "linear-gradient(145deg, #041016 0%, #0891b2 50%, #67e8f9 100%)",
  },
];

export const GLASS_FACE_TEMPLATE_META: Record<
  string,
  { subtitle: string; previewGradient: string }
> = {
  gold: {
    subtitle: "الكلاسيكي الدافئ",
    previewGradient: "linear-gradient(145deg, #1a1208, #d4a63a, #f7e7b4)",
  },
  ocean: {
    subtitle: "أزرق هادئ",
    previewGradient: "linear-gradient(145deg, #060d18, #0ea5e9, #bae6fd)",
  },
  violet: {
    subtitle: "بنفسجي غروب",
    previewGradient: "linear-gradient(145deg, #0a060f, #a855f7, #e9d5ff)",
  },
  silver: {
    subtitle: "فضي معدني",
    previewGradient: "linear-gradient(145deg, #080a0c, #94a3b8, #e2e8f0)",
  },
  fire: {
    subtitle: "جمر وحماس",
    previewGradient: "linear-gradient(145deg, #0f0505, #ef4444, #fca5a5)",
  },
  forest: {
    subtitle: "أخضر ليلي",
    previewGradient: "linear-gradient(145deg, #050f0a, #22c55e, #86efac)",
  },
  geometric: {
    subtitle: "حاد وتقني",
    previewGradient: "linear-gradient(145deg, #0a0f16, #14b8a6, #5eead4)",
  },
  void: {
    subtitle: "أسود لامع",
    previewGradient: "linear-gradient(145deg, #000000, #1e1b4b, #4338ca)",
  },
};
