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

import { isSafeHttpUrl } from "./chatHelpers";

export function isAvatarImageUrl(avatar?: string | null): boolean {
  if (!avatar) return false;
  const value = avatar.trim();
  if (value.startsWith("/")) {
    return !value.includes("..") && !value.includes("\\");
  }
  return isSafeHttpUrl(value);
}

export function normalizeAvatarValue(avatar?: string | null): string {
  const value = (avatar || "").trim();
  return value || "👤";
}
