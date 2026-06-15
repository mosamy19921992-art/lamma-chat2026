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
  antiLinksEnabled: boolean;
  antiSpamEnabled: boolean;
  swearFilterEnabled: boolean;
  bannedWords: string[];
  currentMessages: Message[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function moderateRoomMessage({
  text,
  authorName,
  roomName,
  isBotEnabled,
  antiLinksEnabled,
  antiSpamEnabled,
  swearFilterEnabled,
  bannedWords,
  currentMessages,
}: ModerateRoomMessageOptions): RoomModerationResult {
  let isBlocked = false;
  let isCensored = false;
  let cleanText = text;
  let warningMessage: string | null = null;
  let logMsg: string | null = null;
  let logSeverity: ModerationLogSeverity = "info";

  if (!isBotEnabled) {
    return {
      isBlocked,
      isCensored,
      cleanText,
      warningMessage,
      logMsg,
      logSeverity,
    };
  }

  if (
    antiLinksEnabled &&
    (text.includes("http://") ||
      text.includes("https://") ||
      text.includes("www.") ||
      text.includes(".com") ||
      text.includes(".net"))
  ) {
    isBlocked = true;
    warningMessage = `⚠️ تم حجب رسالة العضو (${authorName}) لأنها تحتوي على رابط خارجي غير مسموح به.`;
    logMsg = `محاولة نشر رابط خارجي مشبوه من [${authorName}] في غرفة [${roomName}] تم حظرها تلقائياً.`;
    logSeverity = "danger";

    return {
      isBlocked,
      isCensored,
      cleanText: "",
      warningMessage,
      logMsg,
      logSeverity,
    };
  }

  const lastUserMsg =
    currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : null;

  if (
    antiSpamEnabled &&
    lastUserMsg &&
    lastUserMsg.author === authorName &&
    lastUserMsg.text === text &&
    lastUserMsg.type === "text"
  ) {
    isBlocked = true;
    warningMessage = `⚠️ يرجى عدم تكرار نفس الرسالة بسرعة يا (${authorName}).`;
    logMsg = `رصد محاولة تكرار رسالة متطابقة (Spam) من [${authorName}] وتم حجبها لمنع الإزعاج.`;
    logSeverity = "warn";

    return {
      isBlocked,
      isCensored,
      cleanText: "",
      warningMessage,
      logMsg,
      logSeverity,
    };
  }

  if (swearFilterEnabled) {
    let foundViolation = false;

    bannedWords.forEach((word) => {
      if (!word || !text.toLowerCase().includes(word.toLowerCase())) {
        return;
      }

      foundViolation = true;
      const stars = "*".repeat(word.length);
      cleanText = cleanText.replace(new RegExp(escapeRegExp(word), "gi"), stars);
    });

    if (foundViolation) {
      isCensored = true;
      warningMessage = `🛡️ تمت مراجعة رسالة العضو (${authorName}) وإخفاء بعض الألفاظ غير المناسبة تلقائياً.`;
      logMsg = `مخالفة فلترة الكلام: تم العثور على ألفاظ منافية لآداب الشات في رسالة [${authorName}] وعُدلت تلقائياً.`;
      logSeverity = "warn";
    }
  }

  return {
    isBlocked,
    isCensored,
    cleanText,
    warningMessage,
    logMsg,
    logSeverity,
  };
}
