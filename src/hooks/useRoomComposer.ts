import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ActivityLog, BanInfo, Message, MessageReplyRef, UserSession } from "../lib/chatTypes";
import {
  appendRoomMessage,
  createOutgoingRoomMessage,
  persistRoomMessage,
} from "../services/chat/messagesService";
import { enqueueOutboxMessage } from "../services/chat/messageOutbox";
import { handleRoomChatCommand } from "../services/chat/roomCommandsService";
import { getYoutubeId, isBrowserOnline, isLikelyNetworkError } from "../lib/chatHelpers";
import { moderateRoomMessage } from "../services/chat/roomModerationService";
import { handleViolationEscalation } from "../services/chat/roomViolationService";
import { checkAnswer, handleGameCommand } from "../services/chat/gamesBot";

interface BotLogEntry {
  id: string;
  time: string;
  text: string;
  severity: "info" | "warn" | "danger";
}

const VIOLATIONS_STORAGE_KEY = "lamma_violation_counts";

export const ROOM_COMPOSER_MAX_CHARS = 500;

interface UseRoomComposerOptions {
  activeRoomId: string;
  activeRoomName: string;
  currentUser: UserSession;
  inputText: string;
  isPostsRoom: boolean;
  canPublishPosts: boolean;
  isBotEnabled: boolean;
  botRuleAntiLinks: boolean;
  botRuleAntiSpam: boolean;
  botRuleSwearFilter: boolean;
  bannedWords: string[];
  bannedUsersList: BanInfo[];
  isMaintenanceMode: boolean;
  isGlobalMute: boolean;
  roomMessages: Record<string, Message[]>;
  violationCount: Record<string, number>;
  myFingerprint: string;
  myBrowserSig: string;
  myIp: string;
  senderUid: string;
  ownerSettingsRowId: string;
  rateLimitRef: MutableRefObject<number[]>;
  setInputText: Dispatch<SetStateAction<string>>;
  setShowEmojiPicker: Dispatch<SetStateAction<boolean>>;
  setRoomMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setIsZenMode: Dispatch<SetStateAction<boolean>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setIsCompactView: Dispatch<SetStateAction<boolean>>;
  setBotLogs: Dispatch<SetStateAction<BotLogEntry[]>>;
  setViolationCount: Dispatch<SetStateAction<Record<string, number>>>;
  setBannedUsersList: Dispatch<SetStateAction<BanInfo[]>>;
  addBotSystemWarning: (roomId: string, message: string) => void;
  addLammaBotMessage: (roomId: string, message: string) => void;
  addSystemActivityLog: (
    type: ActivityLog["type"],
    userNickname: string,
    details: string,
    operatorNickname: string,
  ) => void;
  onOwnerStylePrompt?: (prompt: string) => boolean;
  canShareYoutubeInMessage: () => boolean;
  replyTarget: MessageReplyRef | null;
  clearReplyTarget: () => void;
}

export function useRoomComposer({
  activeRoomId,
  activeRoomName,
  currentUser,
  inputText,
  isPostsRoom,
  canPublishPosts,
  isBotEnabled,
  botRuleAntiLinks,
  botRuleAntiSpam,
  botRuleSwearFilter,
  bannedWords,
  bannedUsersList,
  isMaintenanceMode,
  isGlobalMute,
  roomMessages,
  violationCount,
  myFingerprint,
  myBrowserSig,
  myIp,
  senderUid,
  ownerSettingsRowId,
  rateLimitRef,
  setInputText,
  setShowEmojiPicker,
  setRoomMessages,
  setIsZenMode,
  setIsSidebarOpen,
  setIsCompactView,
  setBotLogs,
  setViolationCount,
  setBannedUsersList,
  addBotSystemWarning,
  addLammaBotMessage,
  addSystemActivityLog,
  onOwnerStylePrompt,
  canShareYoutubeInMessage,
  replyTarget,
  clearReplyTarget,
}: UseRoomComposerOptions) {
  const handleSendMessage = useCallback(async () => {
    try {
    const now = Date.now();
    rateLimitRef.current = rateLimitRef.current.filter((t) => now - t < 1000);
    if (rateLimitRef.current.length >= 3) {
      alert(
        "⚠️ الرجاء الانتظار، لا يمكنك إرسال أكثر من 3 رسائل في الثانية الواحدة لحماية الشات من الإزعاج!",
      );
      return;
    }
    rateLimitRef.current.push(now);

    if (!inputText.trim()) return;

    const trimmedInput = inputText.trim();
    if (!isPostsRoom && trimmedInput.length > ROOM_COMPOSER_MAX_CHARS) {
      alert(
        `⚠️ الرسالة طويلة — الحد الأقصى ${ROOM_COMPOSER_MAX_CHARS} حرف.`,
      );
      return;
    }
    const hasYoutubeLink =
      /youtu\.be\/|youtube\.com\//i.test(trimmedInput) ||
      Boolean(getYoutubeId(trimmedInput));
    if (hasYoutubeLink && !canShareYoutubeInMessage()) {
      alert(
        "🎥 مشاركة روابط يوتيوب غير مفعّلة لحسابك. يمكن للمالك منحها من غرفة القيادة → صلاحيات الأعضاء.",
      );
      return;
    }

    if (isPostsRoom && !canPublishPosts) {
      alert(
        "📰 النشر في روم المنشورات متاح للأعضاء المسجلين فقط. يمكنك المشاهدة الآن أو تسجيل حساب للنشر.",
      );
      return;
    }

    const commandHandled = await handleRoomChatCommand({
      text: inputText,
      roomId: activeRoomId,
      ownerSettingsRowId,
      isBotEnabled,
      antiLinksEnabled: botRuleAntiLinks,
      antiSpamEnabled: botRuleAntiSpam,
      swearFilterEnabled: botRuleSwearFilter,
      bannedWordsCount: bannedWords.length,
      onClearRoom: () =>
        setRoomMessages((prev) => ({
          ...prev,
          [activeRoomId]: [],
        })),
      onEnableZenMode: () => {
        setIsZenMode(true);
        setIsSidebarOpen(false);
      },
      onToggleCompactView: () => {
        setIsCompactView((prev) => !prev);
      },
      onSystemWarning: addBotSystemWarning,
      onInputCleared: () => setInputText(""),
    });

    if (commandHandled) {
      return;
    }

    if (onOwnerStylePrompt?.(inputText)) {
      setInputText("");
      return;
    }

    // Games Bot — only active in the games room
    if (activeRoomId === "games") {
      // 1. Check if it's a game command (/سؤال, /تلميح, etc.)
      const cmdResult = handleGameCommand(inputText, currentUser.nickname);
      if (cmdResult) {
        addLammaBotMessage("games", cmdResult.botMessage);
        setInputText("");
        return;
      }
      // 2. Check if the message is a correct answer to an active game
      const ansResult = checkAnswer(inputText, currentUser.nickname);
      if (ansResult) {
        // Let the user's message go through normally, then post the win message
        setTimeout(() => addLammaBotMessage("games", ansResult.botMessage), 400);
      }
    }

    const isMuted = bannedUsersList.some(
      (ban) =>
        ban.nickname.toLowerCase() === currentUser.nickname.toLowerCase() &&
        ban.type === "mute",
    );
    if (isMuted) {
      alert(
        "🔇 تنبيه حظر الصوت: لقد تم كتم صوتك من الكتابة الشات بقرار من الإدارة لمخالفة قوانين الحوار والآداب العامة.",
      );
      setInputText("");
      return;
    }

    const isOwnerOrAdmin =
      currentUser.role === "owner" || currentUser.role === "admin";

    if (isMaintenanceMode && !isOwnerOrAdmin) {
      alert(
        "⚙️ الشات تحت الصيانة حالياً: يرجى الانتظار لحين انتهاء المالك من أعمال الصيانة والتحديث الفني المباشر.",
      );
      setInputText("");
      return;
    }

    if (isGlobalMute && !isOwnerOrAdmin) {
      alert(
        "🔇 الروم مغلق للكتابة: لقد قامت الإدارة بكتم الدردشة العامة لجميع الأعضاء مؤقتاً للمحافظة على هدوء واستقرار الحوار العامة.",
      );
      setInputText("");
      return;
    }

    const {
      isBlocked,
      isCensored,
      cleanText,
      warningMessage,
      userAlertMessage,
      logMsg,
      logSeverity,
    } = moderateRoomMessage({
      text: inputText,
      authorName: currentUser.nickname,
      roomName: activeRoomName,
      isBotEnabled,
      isOwnerOrAdmin,
      antiLinksEnabled: botRuleAntiLinks,
      antiSpamEnabled: botRuleAntiSpam,
      swearFilterEnabled: botRuleSwearFilter,
      bannedWords,
      currentMessages: roomMessages[activeRoomId] || [],
    });
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    if (logMsg) {
      setBotLogs((prev) => [
        {
          id: `${Date.now()}`,
          time: timeStr,
          text: logMsg,
          severity: logSeverity,
        },
        ...prev,
      ]);
    }

    const userNick = currentUser.nickname;
    const isViolation = isBlocked || isCensored;

    if (isViolation && isBotEnabled) {
      handleViolationEscalation({
        roomId: activeRoomId,
        userNick,
        currentCount: violationCount[userNick] || 0,
        identity: {
          fingerprint: myFingerprint,
          browserSignature: myBrowserSig,
          ip: myIp,
        },
        onViolationCount: (nextCount) => {
          setViolationCount((prev) => {
            const updated = { ...prev, [userNick]: nextCount };
            try {
              localStorage.setItem(VIOLATIONS_STORAGE_KEY, JSON.stringify(updated));
            } catch {
              // storage full – ignore
            }
            return updated;
          });
        },
        onBotMessage: addLammaBotMessage,
        onAddMuteBan: (banInfo) => {
          setBannedUsersList((prev) => {
            const updated = [banInfo, ...prev];
            localStorage.setItem("lamma_banned_list", JSON.stringify(updated));
            return updated;
          });
        },
        onRemoveMuteBan: (nickname) => {
          setBannedUsersList((prev) => {
            const filtered = prev.filter(
              (ban) =>
                ban.nickname.toLowerCase() !== nickname.toLowerCase() ||
                ban.type !== "mute",
            );
            localStorage.setItem("lamma_banned_list", JSON.stringify(filtered));
            return filtered;
          });
        },
        onActivityLog: addSystemActivityLog,
      });
    }

    if (isBlocked) {
      if (userAlertMessage) {
        alert(userAlertMessage);
      }
      if (warningMessage) {
        addBotSystemWarning(activeRoomId, warningMessage);
      }
      setInputText("");
      return;
    }

    const isShadowed = bannedUsersList.some(
      (ban) =>
        ban.type === "shadow" &&
        (ban.nickname.toLowerCase() === currentUser.nickname.toLowerCase() ||
          ban.fingerprint === currentUser.uid ||
          ban.localStorageId === currentUser.uid),
    );

    const activeReply = replyTarget ?? undefined;

    const newMessage = createOutgoingRoomMessage({
      author: userNick,
      text: cleanText,
      color: currentUser.color,
      isShadowed,
      replyTo: activeReply,
    });
    const originalInput = inputText;

    setRoomMessages((prev) => ({
      ...prev,
      [activeRoomId]: appendRoomMessage(
        prev[activeRoomId] || [],
        newMessage,
      ),
    }));
    setInputText("");
    setShowEmojiPicker(false);
    if (replyTarget) {
      clearReplyTarget();
    }

    const queueForLater = () => {
      enqueueOutboxMessage({
        id: newMessage.id,
        roomId: activeRoomId,
        author: userNick,
        text: cleanText,
        color: currentUser.color,
        isShadowed,
        createdAt: Date.now(),
        replyTo: activeReply,
      });
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).map((message) =>
          message.id === newMessage.id
            ? { ...message, sendPending: true }
            : message,
        ),
      }));
      addBotSystemWarning(
        activeRoomId,
        "📥 تم حفظ رسالتك محلياً — ستُرسل تلقائياً عند عودة الإنترنت.",
      );
    };

    if (!isBrowserOnline()) {
      queueForLater();
      return;
    }

    try {
      await persistRoomMessage({
        message: newMessage,
        roomId: activeRoomId,
      });
    } catch (error: any) {
        console.error("Error sending to Supabase:", error);

        // 42501 = RLS policy blocked the insert (server-side moderation)
        if (error?.code === "42501") {
          setRoomMessages((prev) => ({
            ...prev,
            [activeRoomId]: (prev[activeRoomId] || []).filter(
              (m) => m.id !== newMessage.id,
            ),
          }));
          addBotSystemWarning(
            activeRoomId,
            "🛡️ رسالتك تم رفضها من السيرفر لأنها تحتوي على رابط أو كلمة محظورة.",
          );
          setInputText("");
          return;
        }

        if (isLikelyNetworkError(error)) {
          queueForLater();
          return;
        }

        // Roll back the optimistic message for other failures
        setRoomMessages((prev) => ({
          ...prev,
          [activeRoomId]: (prev[activeRoomId] || []).filter(
            (m) => m.id !== newMessage.id,
          ),
        }));

        // Generic server error — give the text back
        setInputText(originalInput);
        alert(
          "❌ تعذر إرسال الرسالة حاليًا. لم يتم حفظها على السيرفر، فتمت إعادتها لك لتجرب الإرسال مرة أخرى.",
        );
        return;
      }

    if (isCensored && warningMessage) {
      setTimeout(() => {
        addBotSystemWarning(activeRoomId, warningMessage);
      }, 600);
    }
    } catch (unexpected) {
      console.error("handleSendMessage failed:", unexpected);
      alert(
        "❌ حصل خطأ غير متوقع أثناء الإرسال. حاول مرة أخرى.",
      );
    }
  }, [
    activeRoomId,
    activeRoomName,
    addBotSystemWarning,
    addLammaBotMessage,
    addSystemActivityLog,
    bannedUsersList,
    bannedWords,
    botRuleAntiLinks,
    botRuleAntiSpam,
    botRuleSwearFilter,
    canPublishPosts,
    currentUser,
    inputText,
    isBotEnabled,
    isGlobalMute,
    isMaintenanceMode,
    isPostsRoom,
    myBrowserSig,
    myFingerprint,
    myIp,
    ownerSettingsRowId,
    rateLimitRef,
    roomMessages,
    senderUid,
    setBannedUsersList,
    setBotLogs,
    setInputText,
    setIsCompactView,
    setIsSidebarOpen,
    setIsZenMode,
    setRoomMessages,
    setShowEmojiPicker,
    setViolationCount,
    violationCount,
    canShareYoutubeInMessage,
    replyTarget,
    clearReplyTarget,
  ]);

  return {
    handleSendMessage,
  };
}

export default useRoomComposer;
