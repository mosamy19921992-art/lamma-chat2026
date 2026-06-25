// Chat constants extracted from ChatScreen.tsx
// All data preserved exactly as-is. Pure refactor — no behavior change.

// count = 0 لأن الأرقام الحقيقية بتيجي ديناميكياً من Supabase عبر roomCounts state في ChatScreen
export const ROOMS_DEF = [
  { id: "egypt", name: "مصر", icon: "🇪🇬", count: 0, category: "social" },
  { id: "arab", name: "كل العرب", icon: "🌍", count: 0, category: "social" },
  { id: "youth", name: "لمة شباب وبنات", icon: "👫", count: 0, category: "social" },
  { id: "palestine", name: "فلسطين", icon: "🇵🇸", count: 0, category: "social" },
  { id: "posts-feed", name: "المنشورات", icon: "📰", count: 0, category: "community" },
  { id: "fun", name: "فرفشة", icon: "🥳", count: 0, category: "fun" },
  { id: "games", name: "Games 🎮", icon: "🎮", count: 0, category: "fun" },
  { id: "romance", name: "رومانسية", icon: "💖", count: 0, category: "relations" },
  { id: "help", name: "مساعدة وشكاوى", icon: "📋", count: 0, category: "social" },
  { id: "admin", name: "الإدارة", icon: "🛡️", count: 0, category: "private", staffOnly: true },
  { id: "owner", name: "بوت التصميم AI", icon: "🎨", count: 0, category: "private", ownerOnly: true },
];

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

