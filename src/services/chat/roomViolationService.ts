import type { BanInfo } from "../../lib/chatTypes";

interface ViolationIdentity {
  fingerprint: string;
  browserSignature: string;
  ip: string;
}

interface HandleViolationEscalationOptions {
  roomId: string;
  userNick: string;
  currentCount: number;
  identity: ViolationIdentity;
  onViolationCount: (nextCount: number) => void;
  onBotMessage: (roomId: string, message: string) => void;
  onAddMuteBan: (banInfo: BanInfo) => void;
  onRemoveMuteBan: (nickname: string) => void;
  onActivityLog: (
    type: "ban" | "promote",
    userNickname: string,
    details: string,
    operatorNickname: string,
  ) => void;
}

function formatBanTime(): string {
  return new Date().toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
  });
}

function createAutoMuteBanInfo(
  userNick: string,
  identity: ViolationIdentity,
): BanInfo {
  return {
    id: `auto-mute-${Date.now()}`,
    nickname: userNick,
    email: "",
    fingerprint: identity.fingerprint,
    browserSignature: identity.browserSignature,
    ip: identity.ip,
    localStorageId: "local-storage-auto",
    type: "mute",
    banner: "🤖 LAMMA SYSTEM",
    reason: "تكرار المخالفات وتجاهل الحاكم الذكي",
    time: formatBanTime(),
  };
}

export function handleViolationEscalation({
  roomId,
  userNick,
  currentCount,
  identity,
  onViolationCount,
  onBotMessage,
  onAddMuteBan,
  onRemoveMuteBan,
  onActivityLog,
}: HandleViolationEscalationOptions): number {
  const nextCount = currentCount + 1;
  onViolationCount(nextCount);

  if (nextCount === 1) {
    setTimeout(() => {
      onBotMessage(
        roomId,
        `⚠️ تنبيه رقابي لـ [${userNick}]: يرجى الالتزام بالقواعد والآداب العامة لشات لمة (إنذار 1 من 3).`,
      );
    }, 800);

    return nextCount;
  }

  if (nextCount === 2) {
    setTimeout(() => {
      onBotMessage(
        roomId,
        `🚨 تحذير نهائي لـ [${userNick}]: عدم الالتزام في المرة القادمة سيعرضك للكتم التلقائي والفوري (إنذار 2 من 3).`,
      );
    }, 850);

    return nextCount;
  }

  if (nextCount >= 3) {
    setTimeout(() => {
      onBotMessage(
        roomId,
        `🔇 كتم تلقائي لـ [${userNick}]: تم إيقاف رخصتك الكتابية لمدة 60 ثانية إثر تكرار المخالفات المكتشفة وتجاهل إنذارات الرقابة الآلية.`,
      );

      onAddMuteBan(createAutoMuteBanInfo(userNick, identity));
      onActivityLog(
        "ban",
        userNick,
        "تم تطبيق الكتم التلقائي بمقدار 60 ثانية لتجاوز الإنذارات الرقابية.",
        "🤖 LAMMA SYSTEM",
      );

      setTimeout(() => {
        onRemoveMuteBan(userNick);
        onBotMessage(
          roomId,
          `🕊️ فك الكتم التلقائي لـ [${userNick}]: انتهت عقوبة الدقيقة الواحدة. نرجو التزام بالمعايير الرصينة المعتمدة للشات.`,
        );
        onActivityLog(
          "promote",
          userNick,
          "إلغاء الكتم التلقائي بعد نهاية العقوبة بنجاح بفضل نظام الأتمتة.",
          "🤖 LAMMA SYSTEM",
        );
      }, 60000);
    }, 900);
  }

  return nextCount;
}
