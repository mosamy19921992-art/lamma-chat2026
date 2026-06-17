import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, type SupabaseMessage } from "../lib/supabase";
import type { Message } from "../lib/chatTypes";
import {
  fetchRoomMessages,
  subscribeToRoomMessages,
  unsubscribeFromRoomMessages,
} from "../services/chat/messagesService";

interface UseChatMessagesOptions {
  activeRoomId: string;
  currentUserNickname: string;
  ignoredUsers: string[];
  blockedUsers: string[];
  publicChatSessionStartedAt: string;
  publicChatSessionStartedAtMs: number;
  senderUid: string;
  onIncomingMessage?: (message: SupabaseMessage, roomId: string) => void;
}

function formatArabicTime(createdAt?: string): string {
  const date = createdAt ? new Date(createdAt) : new Date();
  return date.toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

function mapSupabaseMessage(
  sMsg: SupabaseMessage,
  currentUserNickname: string,
): Message {
  return {
    id: sMsg.id || Date.now().toString(),
    author: sMsg.author,
    text: sMsg.text,
    color: sMsg.color,
    isOwn: sMsg.author === currentUserNickname,
    time: formatArabicTime(sMsg.created_at),
    type: (sMsg.type as Message["type"]) || "text",
    mediaUrl: sMsg.media_url,
    giftIcon: sMsg.gift_icon,
    giftName: sMsg.gift_name,
    youtubeId: sMsg.youtube_id,
    reactions: sMsg.reactions,
  };
}

export function useChatMessages({
  activeRoomId,
  currentUserNickname,
  ignoredUsers,
  blockedUsers,
  publicChatSessionStartedAt,
  publicChatSessionStartedAtMs,
  senderUid,
  onIncomingMessage,
}: UseChatMessagesOptions) {
  const publicChatCleanupDoneRef = useRef(false);
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>(
    {},
  );

  const clearPublicChatStorage = useCallback(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("lamma_messages_")) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn("Failed to clear public chat storage:", error);
    }
  }, []);

  const cleanupPublicChatSession = useCallback(
    (useKeepalive = false) => {
      if (publicChatCleanupDoneRef.current) return;
      publicChatCleanupDoneRef.current = true;

      clearPublicChatStorage();
      setRoomMessages({});

      if (!supabase) return;

      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const { error } = await supabase
            .from("messages")
            .delete()
            .eq("sender_uid", senderUid)
            .gte("created_at", publicChatSessionStartedAt);

          if (error) {
            console.warn("Failed to clean public session messages:", error.message);
          }

          if (useKeepalive && session?.access_token) {
            const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
              /\/rest\/v1\/?$/,
              "",
            );
            if (!supabaseUrl) return;

            const params = new URLSearchParams({
              sender_uid: `eq.${senderUid}`,
              created_at: `gte.${publicChatSessionStartedAt}`,
            });

            void fetch(`${supabaseUrl}/rest/v1/messages?${params.toString()}`, {
              method: "DELETE",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
                Authorization: `Bearer ${session.access_token}`,
              },
              keepalive: true,
            }).catch(() => {});
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error ?? "");
          const isAbortLike =
            message.includes("AbortError") ||
            message.includes("ERR_ABORTED") ||
            message.includes("Failed to fetch");

          if (useKeepalive && isAbortLike) return;

          console.warn("Failed to clean public session messages:", error);
        }
      })();
    },
    [
      clearPublicChatStorage,
      publicChatSessionStartedAt,
      senderUid,
    ],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupPublicChatSession(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [cleanupPublicChatSession]);

  useEffect(() => {
    setRoomMessages((prev) => ({
      ...prev,
      [activeRoomId]: prev[activeRoomId] || [],
    }));
  }, [activeRoomId]);

  useEffect(() => {
    const fetchSupabaseMessages = async () => {
      const { data, error } = await fetchRoomMessages(
        activeRoomId,
        publicChatSessionStartedAt,
      );

      if (!error && data) {
        setRoomMessages((prev) => {
          const currentLocal = prev[activeRoomId] || [];
          const localOnly = currentLocal.filter(
            (m) =>
              (m.id && m.id.startsWith("local-")) ||
              m.type === "join" ||
              m.type === "leave" ||
              m.type === "system",
          );
          const supabaseMessages = data.map((sMsg) =>
            mapSupabaseMessage(sMsg as SupabaseMessage, currentUserNickname),
          );

          return {
            ...prev,
            [activeRoomId]: [...localOnly, ...supabaseMessages],
          };
        });
      }
    };

    void fetchSupabaseMessages();

    const subscription = subscribeToRoomMessages(activeRoomId, {
      onInsert: (sMsg) => {
        if (
          sMsg.created_at &&
          new Date(sMsg.created_at).getTime() < publicChatSessionStartedAtMs
        ) {
          return;
        }

        const newLocalMsg = mapSupabaseMessage(sMsg, currentUserNickname);

        setRoomMessages((prev) => {
          const current = prev[activeRoomId] || [];
          if (current.some((m) => m.id === newLocalMsg.id)) {
            return prev;
          }
          return {
            ...prev,
            [activeRoomId]: [...current, newLocalMsg],
          };
        });

        if (sMsg.author !== currentUserNickname && sMsg.author) {
          onIncomingMessage?.(sMsg, activeRoomId);
        }
      },
      onDelete: (messageId) => {
        setRoomMessages((prev) => ({
          ...prev,
          [activeRoomId]: (prev[activeRoomId] || []).filter(
            (message) => message.id !== messageId,
          ),
        }));
      },
    });

    return () => {
      unsubscribeFromRoomMessages(subscription);
    };
  }, [
    activeRoomId,
    currentUserNickname,
    onIncomingMessage,
    publicChatSessionStartedAt,
    publicChatSessionStartedAtMs,
  ]);

  const allMessages = useMemo(() => {
    return (roomMessages[activeRoomId] || []).filter((msg) => {
      if (msg.type === "shadow_msg") {
        return msg.author === currentUserNickname;
      }

      const cleanAuthor = msg.author
        .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
        .trim()
        .toLowerCase();

      if (
        ignoredUsers.some((u) => u.toLowerCase() === cleanAuthor) ||
        blockedUsers.some((u) => u.toLowerCase() === cleanAuthor)
      ) {
        return false;
      }

      return true;
    });
  }, [activeRoomId, blockedUsers, currentUserNickname, ignoredUsers, roomMessages]);

  return {
    roomMessages,
    setRoomMessages,
    allMessages,
    cleanupPublicChatSession,
  };
}

export default useChatMessages;
