export type LeftColumnSectionsPct = {
  store: number;
  radio: number;
  music: number;
};

export type RightColumnSectionsPct = {
  rooms: number;
  members: number;
};

export type ChatLayoutPrefs = {
  left: LeftColumnSectionsPct;
  right: RightColumnSectionsPct;
};

export const DEFAULT_LEFT_SECTIONS: LeftColumnSectionsPct = {
  store: 33.333,
  radio: 33.333,
  music: 33.334,
};

export const DEFAULT_RIGHT_SECTIONS: RightColumnSectionsPct = {
  rooms: 50,
  members: 50,
};

export const DEFAULT_CHAT_LAYOUT: ChatLayoutPrefs = {
  left: DEFAULT_LEFT_SECTIONS,
  right: DEFAULT_RIGHT_SECTIONS,
};

export type ChatLayoutPresetId = "balanced" | "chat-focus" | "compact-side";

export const CHAT_LAYOUT_PRESETS: Record<
  ChatLayoutPresetId,
  { label: string; layout: ChatLayoutPrefs }
> = {
  balanced: {
    label: "توازن متساوٍ",
    layout: DEFAULT_CHAT_LAYOUT,
  },
  "chat-focus": {
    label: "تركيز على الشات",
    layout: {
      left: { store: 24, radio: 24, music: 52 },
      right: { rooms: 62, members: 38 },
    },
  },
  "compact-side": {
    label: "أعمدة جانبية مضغوطة",
    layout: {
      left: { store: 28, radio: 36, music: 36 },
      right: { rooms: 55, members: 45 },
    },
  },
};

const STORAGE_BASE = "lamma_chat_layout_prefs";

function clampPct(value: number, min = 12, max = 76): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeLeft(
  sections: Partial<LeftColumnSectionsPct> | undefined,
): LeftColumnSectionsPct {
  const store = clampPct(Number(sections?.store) || DEFAULT_LEFT_SECTIONS.store);
  const radio = clampPct(Number(sections?.radio) || DEFAULT_LEFT_SECTIONS.radio);
  const music = clampPct(Number(sections?.music) || DEFAULT_LEFT_SECTIONS.music);
  const total = store + radio + music;
  if (total <= 0) return { ...DEFAULT_LEFT_SECTIONS };
  const scale = 100 / total;
  return {
    store: store * scale,
    radio: radio * scale,
    music: music * scale,
  };
}

function normalizeRight(
  sections: Partial<RightColumnSectionsPct> | undefined,
): RightColumnSectionsPct {
  const rooms = clampPct(Number(sections?.rooms) || DEFAULT_RIGHT_SECTIONS.rooms);
  const members = clampPct(
    Number(sections?.members) || DEFAULT_RIGHT_SECTIONS.members,
  );
  const total = rooms + members;
  if (total <= 0) return { ...DEFAULT_RIGHT_SECTIONS };
  const scale = 100 / total;
  return {
    rooms: rooms * scale,
    members: members * scale,
  };
}

export function normalizeChatLayoutPrefs(
  prefs: Partial<ChatLayoutPrefs> | null | undefined,
): ChatLayoutPrefs {
  return {
    left: normalizeLeft(prefs?.left),
    right: normalizeRight(prefs?.right),
  };
}

export function buildLayoutStorageKey(
  authProvider: string | undefined,
  identity: string,
): string {
  const safeIdentity = (identity || "guest")
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, "_");
  return `${STORAGE_BASE}_${authProvider || "user"}_${safeIdentity}`;
}

export function loadChatLayoutPrefs(storageKey: string): ChatLayoutPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_CHAT_LAYOUT };
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...DEFAULT_CHAT_LAYOUT };
    return normalizeChatLayoutPrefs(JSON.parse(raw) as ChatLayoutPrefs);
  } catch {
    return { ...DEFAULT_CHAT_LAYOUT };
  }
}

export function saveChatLayoutPrefs(
  storageKey: string,
  prefs: ChatLayoutPrefs,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(normalizeChatLayoutPrefs(prefs)));
  } catch {
    // ignore quota errors
  }
}

export function getLayoutPreset(id: ChatLayoutPresetId): ChatLayoutPrefs {
  return normalizeChatLayoutPrefs(CHAT_LAYOUT_PRESETS[id].layout);
}

export function describeLayoutBalance(prefs: ChatLayoutPrefs): {
  score: number;
  isBalanced: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  let score = 100;

  const leftValues = [prefs.left.store, prefs.left.radio, prefs.left.music];
  const leftSpread = Math.max(...leftValues) - Math.min(...leftValues);
  if (leftSpread > 22) {
    score -= 12;
    notes.push("العمود الأيسر غير متوازن بين المتجر والراديو والموسيقى.");
  }

  const rightSpread = Math.abs(prefs.right.rooms - prefs.right.members);
  if (rightSpread > 24) {
    score -= 10;
    notes.push("قسم الغرف والأعضاء في العمود الأيمن يحتاج إعادة توازن.");
  }

  if (prefs.left.store < 20) {
    score -= 6;
    notes.push("مساحة المتجر ضيقة جداً في العمود الأيسر.");
  }

  if (prefs.right.rooms < 35) {
    score -= 6;
    notes.push("قائمة الغرف ضيقة — قد يصعب تصفحها.");
  }

  return {
    score: Math.max(45, Math.min(100, score)),
    isBalanced: score >= 82,
    notes,
  };
}
