import { supabase } from "../../lib/supabase";
import { pingChatBackend } from "./ownerSettingsService";

interface HandleRoomChatCommandOptions {
  text: string;
  roomId: string;
  ownerSettingsRowId: string;
  isBotEnabled: boolean;
  antiLinksEnabled: boolean;
  antiSpamEnabled: boolean;
  swearFilterEnabled: boolean;
  bannedWordsCount: number;
  onClearRoom: () => void;
  onEnableZenMode: () => void;
  onToggleCompactView: () => void;
  onSystemWarning: (roomId: string, message: string) => void;
  onInputCleared: () => void;
}

function buildHelpMessage(): string {
  return `📘 أوامر شات لمة السريعة:
- /ping قياس سرعة الاستجابة
- /clear مسح الشاشة تجميلياً
- /zen وضع التركيز (Zen)
- /compact وضع العرض المدمج
- /guard أو /status تقرير بوت الحماية
- /complaint أو /شكوى — كيف ترفع بلاغ

📋 للمساعدة والشكاوى: ادخل غرفة «مساعدة وشكاوى»
🚩 أو اضغط زر البلاغ 🚩 على أي رسالة مخالفة`;
}

function buildComplaintGuideMessage(): string {
  return `📋 رفع شكوى أو بلاغ في شات لمة:
1️⃣ ادخل غرفة «مساعدة وشكاوى» واكتب تفاصيل المشكلة
2️⃣ أو اضغط 🚩 على الرسالة المخالفة في أي غرفة
3️⃣ اذكر اسم العضو + ماذا حدث — الإدارة تراجع البلاغات من لوحة التحكم

⏳ البلاغات تُراجع من فريق الإدارة — لا تنشر بيانات شخصية هنا.`;
}

function buildGuardStatusMessage({
  isBotEnabled,
  antiLinksEnabled,
  antiSpamEnabled,
  swearFilterEnabled,
  bannedWordsCount,
}: Pick<
  HandleRoomChatCommandOptions,
  | "isBotEnabled"
  | "antiLinksEnabled"
  | "antiSpamEnabled"
  | "swearFilterEnabled"
  | "bannedWordsCount"
>): string {
  let score = 0;
  if (isBotEnabled) score += 30;
  if (antiLinksEnabled) score += 20;
  if (antiSpamEnabled) score += 15;
  if (swearFilterEnabled) score += 15;
  if (bannedWordsCount > 0) score += 20;

  const scoreLabel =
    score >= 90
      ? "🟢 ممتاز"
      : score >= 60
        ? "🟡 جيد"
        : score >= 30
          ? "🟠 ضعيف"
          : "🔴 معطل";

  return `🔥 تقرير LC-Fire — بوت الحماية:
- حالة البوت: ${isBotEnabled ? "🟢 نشط ويحمي الغرف" : "🔴 معطل مؤقتاً"}
- حجب الروابط: ${antiLinksEnabled ? "✅ مفعّل" : "❌ معطل"}
- منع السبام: ${antiSpamEnabled ? "✅ مفعّل" : "❌ معطل"}
- جدار الكلمات: ${swearFilterEnabled ? "✅ مفعّل" : "❌ معطل"} (${bannedWordsCount} كلمة محظورة)
- درجة أمان الغرفة: ${score}/100 ${scoreLabel}`;
}

async function runPingCommand(
  roomId: string,
  ownerSettingsRowId: string,
  onSystemWarning: (roomId: string, message: string) => void,
): Promise<void> {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  if (!supabase) {
    const elapsed =
      typeof performance !== "undefined"
        ? performance.now() - started
        : Date.now() - started;
    onSystemWarning(roomId, `🏓 Pong (local) — ${Math.round(elapsed)}ms`);
    return;
  }

  const ok = await pingChatBackend();

  const elapsed =
    typeof performance !== "undefined"
      ? performance.now() - started
      : Date.now() - started;

  if (!ok) {
    onSystemWarning(
      roomId,
      `🏓 Pong — ${Math.round(elapsed)}ms (مع تحذير)\nتعذر التحقق من اتصال قاعدة البيانات`,
    );
    return;
  }

  onSystemWarning(roomId, `🏓 Pong — ${Math.round(elapsed)}ms`);
}

export async function handleRoomChatCommand({
  text,
  roomId,
  ownerSettingsRowId,
  isBotEnabled,
  antiLinksEnabled,
  antiSpamEnabled,
  swearFilterEnabled,
  bannedWordsCount,
  onClearRoom,
  onEnableZenMode,
  onToggleCompactView,
  onSystemWarning,
  onInputCleared,
}: HandleRoomChatCommandOptions): Promise<boolean> {
  const trimmedText = text.trim();

  if (trimmedText === "/clear") {
    onClearRoom();
    onInputCleared();
    return true;
  }

  if (trimmedText === "/zen") {
    onEnableZenMode();
    onInputCleared();
    return true;
  }

  if (trimmedText === "/compact") {
    onToggleCompactView();
    onInputCleared();
    return true;
  }

  if (trimmedText === "/help") {
    onSystemWarning(roomId, buildHelpMessage());
    onInputCleared();
    return true;
  }

  if (trimmedText === "/ping") {
    await runPingCommand(roomId, ownerSettingsRowId, onSystemWarning);
    onInputCleared();
    return true;
  }

  if (trimmedText === "/guard" || trimmedText === "/status") {
    onSystemWarning(
      roomId,
      buildGuardStatusMessage({
        isBotEnabled,
        antiLinksEnabled,
        antiSpamEnabled,
        swearFilterEnabled,
        bannedWordsCount,
      }),
    );
    onInputCleared();
    return true;
  }

  if (
    trimmedText === "/complaint" ||
    trimmedText === "/شكوى" ||
    trimmedText === "/بلاغ"
  ) {
    onSystemWarning(roomId, buildComplaintGuideMessage());
    onInputCleared();
    return true;
  }

  return false;
}
