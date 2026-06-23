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
  authProvider?: "supabase" | "guest";
  onIncomingMessage?: (message: SupabaseMessage, roomId: string) => void;
}

const MAX_MESSAGES_PER_ROOM = 200;
const MAX_CACHED_ROOMS = 12;

function trimRoomMessages(
  prev: Record<string, Message[]>,
  roomId: string,
  nextRoomMessages: Message[],
): Record<string, Message[]> {
  const next = {
    ...prev,
    [roomId]: nextRoomMessages.slice(-MAX_MESSAGES_PER_ROOM),
  };
  const roomKeys = Object.keys(next);
  if (roomKeys.length <= MAX_CACHED_ROOMS) return next;

  const keep = new Set(roomKeys.slice(-MAX_CACHED_ROOMS));
  keep.add(roomId);
  return Object.fromEntries(
    Object.entries(next).filter(([key]) => keep.has(key)),
  );
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
  const isOwn = sMsg.author === currentUserNickname;
  const isShadow = Boolean(sMsg.is_shadow);
  return {
    id: sMsg.id || Date.now().toString(),
    author: sMsg.author,
    text: sMsg.text,
    color: sMsg.color,
    isOwn,
    time: formatArabicTime(sMsg.created_at),
    type: isShadow && isOwn ? "shadow_msg" : (sMsg.type as Message["type"]) || "text",
    mediaUrl: sMsg.media_url,
    giftIcon: sMsg.gift_icon,
    giftName: sMsg.gift_name,
    youtubeId: sMsg.youtube_id,
    reactions: sMsg.reactions,
  };
}

function mergeFetchedRoomMessages(
  current: Message[],
  fetched: Message[],
): Message[] {
  const seen = new Set<string>();
  const merged: Message[] = [];

  for (const msg of fetched) {
    if (!msg.id || seen.has(msg.id)) continue;
    seen.add(msg.id);
    merged.push(msg);
  }

  for (const msg of current) {
    if (!msg.id || seen.has(msg.id)) continue;
    seen.add(msg.id);
    merged.push(msg);
  }

  return merged;
}

export function useChatMessages({
  activeRoomId,
  currentUserNickname,
  ignoredUsers,
  blockedUsers,
  publicChatSessionStartedAt,
  publicChatSessionStartedAtMs,
  senderUid,
  authProvider,
  onIncomingMessage,
}: UseChatMessagesOptions) {
  const beforeUnloadCleanupAttemptedRef = useRef(false);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  const roomFetchGenerationRef = useRef(0);
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>(
    {},
  );

  useEffect(() => {
    onIncomingMessageRef.current = onIncomingMessage;
  }, [onIncomingMessage]);

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
    (source: "beforeunload" | "logout" = "logout") => {
      clearPublicChatStorage();
      setRoomMessages({});

      // Only ephemeral guest sessions should purge server-side messages.
      if (authProvider !== "guest" || !supabase) return;

      if (source === "beforeunload") {
        if (beforeUnloadCleanupAttemptedRef.current) return;
        beforeUnloadCleanupAttemptedRef.current = true;
      }

      const useKeepalive = source === "beforeunload";

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
            if (source === "beforeunload") {
              beforeUnloadCleanupAttemptedRef.current = false;
            }
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
      authProvider,
      clearPublicChatStorage,
      publicChatSessionStartedAt,
      senderUid,
    ],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupPublicChatSession("beforeunload");
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
    const fetchGeneration = ++roomFetchGenerationRef.current;
    let cancelled = false;
    const pendingInsertsRef: Message[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPendingInserts = () => {
      flushTimer = null;
      if (cancelled || pendingInsertsRef.length === 0) return;

      const batch = pendingInsertsRef.splice(0);
      setRoomMessages((prev) => {
        if (cancelled || fetchGeneration !== roomFetchGenerationRef.current) {
          return prev;
        }
        const current = prev[activeRoomId] || [];
        const seen = new Set(current.map((m) => m.id));
        const toAdd = batch.filter((m) => m.id && !seen.has(m.id));
        if (toAdd.length === 0) return prev;
        return trimRoomMessages(prev, activeRoomId, [...current, ...toAdd]);
      });
    };

    const queueInsert = (newLocalMsg: Message) => {
      if (!newLocalMsg.id) return;
      pendingInsertsRef.push(newLocalMsg);
      if (!flushTimer) {
        flushTimer = setTimeout(flushPendingInserts, 32);
      }
    };

    const fetchSupabaseMessages = async (attempt = 0) => {
      try {
        const { data, error } = await fetchRoomMessages(
          activeRoomId,
          publicChatSessionStartedAt,
        );

        if (
          cancelled ||
          fetchGeneration !== roomFetchGenerationRef.current
        ) {
          return;
        }

        if (error) {
          if (attempt < 2) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1200 * (attempt + 1)),
            );
            if (!cancelled && fetchGeneration === roomFetchGenerationRef.current) {
              return fetchSupabaseMessages(attempt + 1);
            }
          }
          console.warn("Failed to fetch room messages:", error.message);
          return;
        }

        if (data) {
          const chronological = [...data].reverse();
          setRoomMessages((prev) => {
            if (fetchGeneration !== roomFetchGenerationRef.current) {
              return prev;
            }
            const currentLocal = prev[activeRoomId] || [];
            const supabaseMessages = chronological.map((sMsg) =>
              mapSupabaseMessage(sMsg as SupabaseMessage, currentUserNickname),
            );

            return trimRoomMessages(
              prev,
              activeRoomId,
              mergeFetchedRoomMessages(currentLocal, supabaseMessages),
            );
          });
        }
      } catch (error) {
        if (attempt < 2 && !cancelled) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1200 * (attempt + 1)),
          );
          if (fetchGeneration === roomFetchGenerationRef.current) {
            return fetchSupabaseMessages(attempt + 1);
          }
        }
        console.warn("Failed to fetch room messages:", error);
      }
    };

    void fetchSupabaseMessages();

    const subscription = subscribeToRoomMessages(activeRoomId, {
      onInsert: (sMsg) => {
        if (cancelled) return;
        if (!sMsg.id) return;

        if (
          sMsg.created_at &&
          new Date(sMsg.created_at).getTime() < publicChatSessionStartedAtMs
        ) {
          return;
        }

        const newLocalMsg = mapSupabaseMessage(sMsg, currentUserNickname);
        queueInsert(newLocalMsg);

        if (sMsg.author !== currentUserNickname && sMsg.author) {
          onIncomingMessageRef.current?.(sMsg, activeRoomId);
        }
      },
      onDelete: (messageId) => {
        if (cancelled) return;
        setRoomMessages((prev) => ({
          ...prev,
          [activeRoomId]: (prev[activeRoomId] || []).filter(
            (message) => message.id !== messageId,
          ),
        }));
      },
    });

    return () => {
      cancelled = true;
      if (flushTimer) clearTimeout(flushTimer);
      pendingInsertsRef.length = 0;
      unsubscribeFromRoomMessages(subscription);
    };
  }, [
    activeRoomId,
    currentUserNickname,
    publicChatSessionStartedAt,
    publicChatSessionStartedAtMs,
  ]);

  const allMessages = useMemo(() => {
    return (roomMessages[activeRoomId] || []).filter((msg) => {
      if (msg.type === "shadow_msg") {
        return msg.author === currentUserNickname;
      }

      const cleanAuthor = (msg.author ?? "")
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
