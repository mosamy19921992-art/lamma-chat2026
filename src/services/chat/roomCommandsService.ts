import { supabase } from "../../lib/supabase";

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
- /guard أو /status تقرير بوت الحماية`;
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
  return `🤖 تقرير حارس الشات اللاسلكي Lamma Guard:
- حالة البوت: ${isBotEnabled ? "🟢 نشط ويحمي الغرف" : "🔴 معطل مؤقتاً"}
- تصفية الروابط: ${antiLinksEnabled ? "✅ مفعّل" : "❌ معطل"}
- منع المزعجين: ${antiSpamEnabled ? "✅ مفعّل" : "❌ معطل"}
- تصفية الشتائم: ${swearFilterEnabled ? "✅ مفعّل" : "❌ معطل"}
- عدد الكلمات المحظورة: ${bannedWordsCount} كلمة.
- جودة أمان الشات: 100% مستقر ونظيف.`;
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

  const { error } = await supabase
    .from("owner_settings")
    .select("id")
    .eq("id", ownerSettingsRowId)
    .maybeSingle();

  const elapsed =
    typeof performance !== "undefined"
      ? performance.now() - started
      : Date.now() - started;

  if (error) {
    onSystemWarning(
      roomId,
      `🏓 Pong — ${Math.round(elapsed)}ms (مع تحذير)\nتعذر التحقق من اتصال قاعدة البيانات: ${error.message}`,
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

  return false;
}
