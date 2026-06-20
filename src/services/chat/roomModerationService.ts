import type { Message } from "../../lib/chatTypes";

export type ModerationLogSeverity = "info" | "warn" | "danger";

export interface RoomModerationResult {
  isBlocked: boolean;
  isCensored: boolean;
  cleanText: string;
  warningMessage: string | null;
  logMsg: string | null;
  logSeverity: ModerationLogSeverity;
}

interface ModerateRoomMessageOptions {
  text: string;
  authorName: string;
  roomName: string;
  isBotEnabled: boolean;
  isOwnerOrAdmin: boolean;
  antiLinksEnabled: boolean;
  antiSpamEnabled: boolean;
  swearFilterEnabled: boolean;
  bannedWords: string[];
  currentMessages: Message[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Only match actual URLs, not random words containing .com etc.
const URL_PATTERN =
  /https?:\/\/[^\s]+|www\.[a-z0-9-]+\.[a-z]{2,}([^\s]*)?|\b[a-z0-9-]+\.(com|net|org|io|co|app|live|tk|cc|ru|to|link|site|gg|me|tv)(\b|\/)/i;

export function moderateRoomMessage({
  text,
  authorName,
  roomName,
  isBotEnabled,
  isOwnerOrAdmin,
  antiLinksEnabled,
  antiSpamEnabled,
  swearFilterEnabled,
  bannedWords,
  currentMessages,
}: ModerateRoomMessageOptions): RoomModerationResult {
  const blank: RoomModerationResult = {
    isBlocked: false,
    isCensored: false,
    cleanText: text,
    warningMessage: null,
    logMsg: null,
    logSeverity: "info",
  };

  // Owners and admins are always exempt from bot moderation
  if (!isBotEnabled || isOwnerOrAdmin) return blank;

  // ── Anti-links ──────────────────────────────────────────────────────────────
  if (antiLinksEnabled && URL_PATTERN.test(text)) {
    return {
      isBlocked: true,
      isCensored: false,
      cleanText: "",
      warningMessage: `🔥 LC-Fire: تم حجب رسالة العضو (${authorName}) لأنها تحتوي على رابط خارجي.`,
      logMsg: `محاولة نشر رابط خارجي من [${authorName}] في غرفة [${roomName}] — تم الحجب تلقائياً.`,
      logSeverity: "danger",
    };
  }

  // ── Anti-spam (consecutive duplicates) ──────────────────────────────────────
  const lastMsg = currentMessages.length
    ? currentMessages[currentMessages.length - 1]
    : null;

  if (
    antiSpamEnabled &&
    lastMsg &&
    lastMsg.author === authorName &&
    lastMsg.text === text &&
    lastMsg.type === "text"
  ) {
    return {
      isBlocked: true,
      isCensored: false,
      cleanText: "",
      warningMessage: `⚠️ يرجى عدم تكرار نفس الرسالة يا (${authorName}).`,
      logMsg: `تكرار رسالة متطابقة (Spam) من [${authorName}] — تم الحجب.`,
      logSeverity: "warn",
    };
  }

  // ── Word Firewall (block any message containing a banned word) ───────────────
  if (swearFilterEnabled && bannedWords.length > 0) {
    const lowerText = text.toLowerCase();
    const hitWord = bannedWords.find(
      (w) => w && lowerText.includes(w.toLowerCase()),
    );

    if (hitWord) {
      return {
        isBlocked: true,
        isCensored: false,
        cleanText: "",
        warningMessage: `🔥 LC-Fire: تم حجب رسالة العضو (${authorName}) لاحتوائها على كلمة محظورة.`,
        logMsg: `جدار الكلمات: كلمة محظورة وُجدت في رسالة [${authorName}] — الرسالة محجوبة تلقائياً.`,
        logSeverity: "danger",
      };
    }
  }

  return blank;
}
