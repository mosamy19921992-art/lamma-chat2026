import type { ChatMember } from "../../lib/chatTypes";

/** Stable IDs — never collide with real user uids. */
export const OFFICIAL_BOT_IDS = {
  guard: "official-bot-lc-fire",
  system: "official-bot-lamma-system",
  help: "official-bot-lamma-help",
  games: "official-bot-games",
} as const;

export const OFFICIAL_BOT_AUTHORS = {
  guard: "🔥 LC-Fire",
  system: "🤖 LAMMA SYSTEM",
  help: "📋 مساعد لمة",
  games: "🎮 Games Bot",
} as const;

export type OfficialBotId = keyof typeof OFFICIAL_BOT_IDS;

export type OfficialBotDefinition = {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
  badge: string;
  description: string;
  /** Empty = every room. */
  roomIds?: string[];
  requiresGuardEnabled?: boolean;
};

/** Staff/design rooms — bots stay out of private presence lists. */
const OFFICIAL_BOT_EXCLUDED_ROOM_IDS = new Set(["owner", "admin"]);

const OFFICIAL_BOTS: OfficialBotDefinition[] = [
  {
    id: OFFICIAL_BOT_IDS.guard,
    nickname: OFFICIAL_BOT_AUTHORS.guard,
    avatar: "🔥",
    color: "#f97316",
    badge: "حماية",
    description:
      "بوت الحماية الرسمي — يراقب الروابط والسبام والكلمات المحظورة في الغرف العامة.",
    requiresGuardEnabled: true,
  },
  {
    id: OFFICIAL_BOT_IDS.system,
    nickname: OFFICIAL_BOT_AUTHORS.system,
    avatar: "🤖",
    color: "#10b981",
    badge: "نظام",
    description:
      "بوت الإعلانات الرسمي — ترحيب، VIP، صيانة، وتنبيهات عامة من إدارة الشات.",
  },
  {
    id: OFFICIAL_BOT_IDS.help,
    nickname: OFFICIAL_BOT_AUTHORS.help,
    avatar: "📋",
    color: "#38bdf8",
    badge: "مساعدة",
    description:
      "بوت المساعدة — للشكاوى استخدم /complaint أو غرفة «مساعدة». لا يقبل رسائل خاصة.",
  },
  {
    id: OFFICIAL_BOT_IDS.games,
    nickname: OFFICIAL_BOT_AUTHORS.games,
    avatar: "🎮",
    color: "#a855f7",
    badge: "ألعاب",
    description: "بوت الألعاب — أوامر /مساعدة و/سؤال في غرفة Games فقط.",
    roomIds: ["games"],
  },
];

function toChatMember(def: OfficialBotDefinition): ChatMember {
  return {
    id: def.id,
    nickname: def.nickname,
    role: "user",
    color: def.color,
    avatar: def.avatar,
    status: "online",
    badge: def.badge,
    title: "بوت رسمي",
    fingerprint: "",
    browserSignature: "",
    ip: "",
    localStorageId: def.id,
    bio: def.description,
  };
}

export function isOfficialBotId(id: string | undefined | null): boolean {
  return Boolean(id && id.startsWith("official-bot-"));
}

export function isOfficialBotNickname(nickname: string | undefined | null): boolean {
  if (!nickname) return false;
  const n = nickname.trim();
  return OFFICIAL_BOTS.some((b) => b.nickname === n);
}

export function isOfficialBotMember(member: Pick<ChatMember, "id" | "nickname">): boolean {
  return isOfficialBotId(member.id) || isOfficialBotNickname(member.nickname);
}

export function getOfficialBotByNickname(
  nickname: string,
): (OfficialBotDefinition & { member: ChatMember }) | null {
  const def = OFFICIAL_BOTS.find((b) => b.nickname === nickname.trim());
  if (!def) return null;
  return { ...def, member: toChatMember(def) };
}

export function getOfficialBotDefinition(id: OfficialBotId): OfficialBotDefinition {
  return OFFICIAL_BOTS.find((b) => b.id === OFFICIAL_BOT_IDS[id])!;
}

export function getOfficialBotsForRoom(
  roomId: string,
  options?: { guardEnabled?: boolean },
): ChatMember[] {
  if (OFFICIAL_BOT_EXCLUDED_ROOM_IDS.has(roomId)) return [];
  const guardOn = options?.guardEnabled !== false;
  return OFFICIAL_BOTS.filter((def) => {
    if (def.requiresGuardEnabled && !guardOn) return false;
    if (def.roomIds && def.roomIds.length > 0) {
      return def.roomIds.includes(roomId);
    }
    return true;
  }).map(toChatMember);
}

/** Message authors that must not open profile / PM flows. */
export function isNonInteractiveChatAuthor(author: string): boolean {
  if (!author) return false;
  if (isOfficialBotNickname(author)) return true;
  return /LAMMA|LC-Fire|مساعد|Games Bot|نظام|حارس|تقرير/i.test(author);
}
