// Chat constants extracted from ChatScreen.tsx
// All data preserved exactly as-is. Pure refactor — no behavior change.

// count = 0 لأن الأرقام الحقيقية بتيجي ديناميكياً من Supabase عبر roomCounts state في ChatScreen
export const ROOMS_DEF = [
  { id: "egypt", name: "مصر", icon: "🇪🇬", count: 0, category: "social" },
  { id: "arab", name: "كل العرب", icon: "🌍", count: 0, category: "social" },
  { id: "youth", name: "لمة شباب وبنات", icon: "👫", count: 0, category: "social" },
  { id: "palestine", name: "فلسطين", icon: "🇵🇸", count: 0, category: "social" },
  { id: "posts-feed", name: "منشورات", icon: "📰", count: 0, category: "community" },
  { id: "fun", name: "فرفشة", icon: "🥳", count: 0, category: "fun" },
  { id: "games", name: "Games 🎮", icon: "🎮", count: 0, category: "fun" },
  { id: "romance", name: "رومانسية", icon: "💖", count: 0, category: "relations" },
  { id: "help", name: "مساعدة", icon: "📋", count: 0, category: "social" },
  { id: "admin", name: "إدارة", icon: "🛡️", count: 0, category: "private", staffOnly: true },
  { id: "owner", name: "تصميم", icon: "🎨", count: 0, category: "private", ownerOnly: true },
];

/** Default room order in lists — flat, no category headers. */
export const ROOM_DISPLAY_ORDER = [
  "egypt",
  "arab",
  "youth",
  "palestine",
  "fun",
  "games",
  "romance",
  "posts-feed",
  "help",
  "admin",
  "owner",
] as const;

export type RoomListEntry = {
  id: string;
  name: string;
  icon: string;
  count: number;
  staffOnly?: boolean;
  ownerOnly?: boolean;
};

export function filterAndSortRoomsForList<T extends RoomListEntry>(
  rooms: T[],
  access: { isManagementRole: boolean; isOwnerRole: boolean },
): T[] {
  const visible = rooms.filter((room) => {
    if (room.staffOnly && !access.isManagementRole) return false;
    if (room.ownerOnly && !access.isOwnerRole) return false;
    return true;
  });
  const orderIndex = new Map(
    ROOM_DISPLAY_ORDER.map((id, index) => [id, index * 10]),
  );
  const customRoomSort = ROOM_DISPLAY_ORDER.indexOf("help") * 10 + 5;
  return [...visible].sort((a, b) => {
    const ai = orderIndex.get(a.id as (typeof ROOM_DISPLAY_ORDER)[number]) ?? customRoomSort;
    const bi = orderIndex.get(b.id as (typeof ROOM_DISPLAY_ORDER)[number]) ?? customRoomSort;
    if (ai !== bi) return ai - bi;
    return a.id.localeCompare(b.id, "ar");
  });
}

/** @deprecated Category headers removed from room list UI — order uses ROOM_DISPLAY_ORDER. */
export const ROOM_CATEGORIES = [
  { id: "social", name: "اجتماعي", icon: "👥" },
  { id: "community", name: "مجتمع", icon: "📰" },
  { id: "fun", name: "ترفيه", icon: "🎮" },
  { id: "relations", name: "علاقات", icon: "💖" },
  { id: "private", name: "خاصة", icon: "🛡️" },
];

export const GIFT_TYPES = [
  { icon: "🌹", name: "وردة", color: "#ef4444" },
  { icon: "💖", name: "قلب", color: "#f43f5e" },
  { icon: "☕", name: "قهوة", color: "#b45309" },
  { icon: "💎", name: "الماس", color: "#38bdf8" },
  { icon: "👑", name: "تاج", color: "#eab308" },
  { icon: "🏆", name: "كأس", color: "#f59e0b" },
  { icon: "🔥", name: "شعلة", color: "#f97316" },
];

export const EMOTICONS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","☺️","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗",
  "😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕",
  "🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰",
  "😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤",
  "😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀",
  "☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾","👋","🤚","🖐","✋","🖖","👌",
  "🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏",
  "🙌","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴",
  "👀","👁","👅","👄","💋","🩸","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓",
  "💗","💖","💘","💝",
];

