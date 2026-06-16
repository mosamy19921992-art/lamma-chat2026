/** Emoji choices for registered users' profile avatars */
export const PROFILE_AVATAR_EMOJIS = [
  "👤",
  "😊",
  "😎",
  "🥳",
  "🦁",
  "🐯",
  "🦊",
  "🐼",
  "🐨",
  "🦄",
  "👑",
  "🔥",
  "⭐",
  "💎",
  "🎮",
  "🎵",
  "⚽",
  "🌸",
  "🌙",
  "☀️",
  "🚀",
  "💚",
  "💜",
  "🎯",
] as const;

export function isAvatarImageUrl(avatar?: string | null): boolean {
  if (!avatar) return false;
  const value = avatar.trim();
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

export function normalizeAvatarValue(avatar?: string | null): string {
  const value = (avatar || "").trim();
  return value || "👤";
}
