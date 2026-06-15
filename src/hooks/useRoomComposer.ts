import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ActivityLog, BanInfo, Message, UserSession } from "../lib/chatTypes";
import {
  appendRoomMessage,
  createOutgoingRoomMessage,
  persistRoomMessage,
} from "../services/chat/messagesService";
import { handleRoomChatCommand } from "../services/chat/roomCommandsService";
import { moderateRoomMessage } from "../services/chat/roomModerationService";
import { handleViolationEscalation } from "../services/chat/roomViolationService";

interface BotLogEntry {
  id: string;
  time: string;
  text: string;
  severity: "info" | "warn" | "danger";
}

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
}: UseRoomComposerOptions) {
  const handleSendMessage = useCallback(async () => {
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
      logMsg,
      logSeverity,
    } = moderateRoomMessage({
      text: inputText,
      authorName: currentUser.nickname,
      roomName: activeRoomName,
      isBotEnabled,
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
          setViolationCount((prev) => ({ ...prev, [userNick]: nextCount }));
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
      if (warningMessage) {
        addBotSystemWarning(activeRoomId, warningMessage);
      }
      setInputText("");
      return;
    }

    const isShadowed = bannedUsersList.some(
      (ban) =>
        ban.nickname.toLowerCase() === currentUser.nickname.toLowerCase() &&
        ban.type === "shadow",
    );

    if (false) {
      const localMsg: Message = {
        id: "local-" + Date.now(),
        author: userNick,
        text: cleanText,
        color: currentUser.color || "#10b981",
        isOwn: true,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
        type: "text",
      };

      setRoomMessages((prev) => {
        const currentMsgs = prev[activeRoomId] || [];
        return {
          ...prev,
          [activeRoomId]: [...currentMsgs, localMsg],
        };
      });
    } else {
      const newMessage = createOutgoingRoomMessage({
        author: userNick,
        text: cleanText,
        color: currentUser.color,
        isShadowed,
      });
      setRoomMessages((prev) => ({
        ...prev,
        [activeRoomId]: appendRoomMessage(
          prev[activeRoomId] || [],
          newMessage,
        ),
      }));

      try {
        await persistRoomMessage({
          message: newMessage,
          roomId: activeRoomId,
          senderUid,
        });
      } catch (error) {
        console.error("Error sending to Supabase:", error);
      }
    }

    if (isCensored && warningMessage) {
      setTimeout(() => {
        addBotSystemWarning(activeRoomId, warningMessage);
      }, 600);
    }

    setInputText("");
    setShowEmojiPicker(false);
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
  ]);

  return {
    handleSendMessage,
  };
}

export default useRoomComposer;
