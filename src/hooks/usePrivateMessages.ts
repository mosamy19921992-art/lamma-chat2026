import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PMTargetState, PMThreadMessage, UserSession } from "../lib/chatTypes";
import type { PrivateMessageType } from "../lib/socialTypes";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";
import { markPrivateMessagesAsRead } from "../services/chat/privateMessagesService";

interface UsePrivateMessagesOptions {
  currentUser: UserSession;
  isSpyMode: boolean;
  isPmOpen: boolean;
  playMessageSound?: () => void;
  onIncomingPm?: (payload: {
    senderNickname: string;
    preview: string;
    messageId?: string;
  }) => void;
}

const PM_SPY_FETCH_LIMIT = 500;
const PM_THREAD_CAP = 100;
const MARKED_READ_CAP = 500;

function trimMarkedReadSet(set: Set<string>, max = MARKED_READ_CAP): void {
  if (set.size <= max) return;
  const overflow = set.size - max;
  const iter = set.values();
  for (let i = 0; i < overflow; i += 1) {
    const next = iter.next();
    if (next.done) break;
    set.delete(next.value);
  }
}

function formatPmTime(createdAt?: string) {
  const date = createdAt ? new Date(createdAt) : new Date();
  return date.toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function hasPmMessageWithDbId(
  thread: PMThreadMessage[],
  dbId?: string,
): boolean {
  if (!dbId) return false;
  return thread.some((message) => message.dbId === dbId);
}

type IncomingPmRow = {
  id?: string;
  text?: string | null;
  type?: string | null;
  media_url?: string | null;
  is_read?: boolean | null;
  created_at?: string;
  sender_nickname?: string;
  receiver_nickname?: string;
  sender_uid?: string;
  receiver_uid?: string;
};

function mapIncomingPmMessage(
  sMsg: IncomingPmRow,
  isSender: boolean,
): PMThreadMessage {
  const msgType = (sMsg.type as PrivateMessageType) || "text";
  return {
    text: sMsg.text || "",
    isOwn: isSender,
    time: formatPmTime(sMsg.created_at),
    status: isSender
      ? sMsg.is_read
        ? "read"
        : "delivered"
      : "read",
    dbId: sMsg.id,
    type: msgType,
    mediaUrl: sMsg.media_url || undefined,
  };
}

function applyIncomingPmMessage(
  prev: Record<string, PMThreadMessage[]>,
  sMsg: IncomingPmRow,
  myUid: string,
  myNick: string,
  isSpyMode: boolean,
  isOwner: boolean,
): Record<string, PMThreadMessage[]> {
  const isSender = sMsg.sender_uid === myUid;
  const isReceiver = sMsg.receiver_uid === myUid;
  const spyIntercept = isOwner && isSpyMode && !isSender && !isReceiver;

  if (!isSender && !isReceiver && !spyIntercept) {
    return prev;
  }

  let otherPerson = isSender
    ? sMsg.receiver_nickname
    : sMsg.sender_nickname;

  if (spyIntercept) {
    otherPerson = `🕵️ ${sMsg.sender_nickname} -> ${sMsg.receiver_nickname}`;
  }

  if (!otherPerson) return prev;

  const currentThread = prev[otherPerson] || [];
  if (hasPmMessageWithDbId(currentThread, sMsg.id)) {
    return prev;
  }

  return {
    ...prev,
    [otherPerson]: [
      ...currentThread,
      mapIncomingPmMessage(sMsg, isSender),
    ].slice(-PM_THREAD_CAP),
  };
}

function loadPmThreadsFromStorage(storageKey: string): Record<string, PMThreadMessage[]> {
  const fallbackThreads: Record<string, PMThreadMessage[]> = {};
  const saved = localStorage.getItem(storageKey);
  if (!saved) return fallbackThreads;
  try {
    return JSON.parse(saved) as Record<string, PMThreadMessage[]>;
  } catch {
    return fallbackThreads;
  }
}

export function usePrivateMessages({
  currentUser,
  isSpyMode,
  isPmOpen,
  playMessageSound,
  onIncomingPm,
}: UsePrivateMessagesOptions) {
  const [pmTarget, setPmTarget] = useState<PMTargetState | null>(null);
  const [pmInputText, setPmInputText] = useState("");
  const [isPmTyping] = useState(false);
  const pmThreadsStorageKey = `lamma_pm_threads_${currentUser.uid || currentUser.nickname}`;
  const [pmThreads, setPmThreads] = useState<Record<string, PMThreadMessage[]>>(
    () => loadPmThreadsFromStorage(pmThreadsStorageKey),
  );
  const pmHydratedForKeyRef = useRef<string | null>(null);
  const playMessageSoundRef = useRef(playMessageSound);
  const onIncomingPmRef = useRef(onIncomingPm);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const pmFetchGenerationRef = useRef(0);
  const pmPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playMessageSoundRef.current = playMessageSound;
  }, [playMessageSound]);

  useEffect(() => {
    onIncomingPmRef.current = onIncomingPm;
  }, [onIncomingPm]);

  const activePmNickname = pmTarget?.nickname || "";
  const pmMessages = useMemo(
    () => (activePmNickname ? pmThreads[activePmNickname] || [] : []),
    [activePmNickname, pmThreads],
  );

  useEffect(() => {
    pmHydratedForKeyRef.current = null;
    markedReadIdsRef.current.clear();
    setPmTarget(null);
    setPmInputText("");
    setPmThreads(loadPmThreadsFromStorage(pmThreadsStorageKey));
    pmHydratedForKeyRef.current = pmThreadsStorageKey;
  }, [pmThreadsStorageKey]);

  useEffect(() => {
    if (pmHydratedForKeyRef.current !== pmThreadsStorageKey) return;

    if (pmPersistTimerRef.current) {
      clearTimeout(pmPersistTimerRef.current);
    }

    pmPersistTimerRef.current = setTimeout(() => {
      const trimmedThreads: Record<string, PMThreadMessage[]> = {};
      Object.keys(pmThreads).forEach((user) => {
        trimmedThreads[user] = pmThreads[user].slice(-PM_THREAD_CAP);
      });
      try {
        localStorage.setItem(pmThreadsStorageKey, JSON.stringify(trimmedThreads));
      } catch {
        // quota — ignore
      }
    }, 350);

    return () => {
      if (pmPersistTimerRef.current) {
        clearTimeout(pmPersistTimerRef.current);
        pmPersistTimerRef.current = null;
      }
    };
  }, [pmThreads, pmThreadsStorageKey]);

  useEffect(() => {
    if (!supabase || !currentUser.uid) {
      return;
    }

    const myUid = currentUser.uid;
    const myNick = currentUser.nickname;
    const isOwner = currentUser.role === "owner";
    const fetchGeneration = ++pmFetchGenerationRef.current;
    let cancelled = false;

    const fetchDatabasePMs = async () => {
      try {
        let query = supabase.from("pm_messages").select("*");
        if (!(isOwner && isSpyMode)) {
          query = query.or(
            `sender_uid.eq.${myUid},receiver_uid.eq.${myUid}`,
          );
          query = query.order("created_at", { ascending: true });
        } else {
          query = query
            .order("created_at", { ascending: false })
            .limit(PM_SPY_FETCH_LIMIT);
        }
        const { data: rawData, error } = await query;

        if (cancelled || fetchGeneration !== pmFetchGenerationRef.current) {
          return;
        }

        if (error) {
          console.error("Error fetching database PMs:", error);
          return;
        }

        const data =
          isOwner && isSpyMode && rawData ? [...rawData].reverse() : rawData;

        if (data && data.length > 0) {
          setPmThreads((prev) => {
            if (fetchGeneration !== pmFetchGenerationRef.current) return prev;
            let next = prev;
            data.forEach((sMsg: IncomingPmRow) => {
              next = applyIncomingPmMessage(
                next,
                sMsg,
                myUid,
                myNick,
                isSpyMode,
                isOwner,
              );
            });
            return next;
          });
        }
      } catch (error) {
        console.warn("Error fetching database PMs:", error);
      }
    };

    void fetchDatabasePMs();

    const handleInsert = (payload: { new: Record<string, unknown> }) => {
      if (cancelled) return;
      const sMsg = payload.new as IncomingPmRow;
      const isSender = sMsg.sender_uid === myUid;
      const isReceiver = sMsg.receiver_uid === myUid;

      setPmThreads((prev) =>
        applyIncomingPmMessage(
          prev,
          sMsg,
          myUid,
          myNick,
          isSpyMode,
          isOwner,
        ),
      );

      if (!isSender && isReceiver) {
        onIncomingPmRef.current?.({
          senderNickname: sMsg.sender_nickname || "مستخدم",
          preview: (sMsg.text || sMsg.media_url || "[مرفق]").slice(0, 120),
          messageId: sMsg.id,
        });
      }
    };

    const handleReadReceiptUpdate = (payload: {
      new: Record<string, unknown>;
    }) => {
      if (cancelled) return;
      const updated = payload.new as IncomingPmRow;
      if (!updated.id || !updated.is_read) return;
      setPmThreads((prev) => {
        let changed = false;
        const next: Record<string, PMThreadMessage[]> = {};
        for (const [key, thread] of Object.entries(prev)) {
          next[key] = thread.map((msg) => {
            if (msg.dbId === updated.id && msg.isOwn) {
              changed = true;
              return { ...msg, status: "read" as const };
            }
            return msg;
          });
        }
        return changed ? next : prev;
      });
    };

    let unsubSent: (() => void) | undefined;
    let unsubReceived: (() => void) | undefined;
    let unsubSpy: (() => void) | undefined;

    if (isOwner && isSpyMode) {
      unsubSpy = subscribeChannelWithRetry(() =>
        supabase
          .channel(`pm_spy_${myUid}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "pm_messages",
            },
            handleInsert,
          ),
      );
    } else {
      unsubSent = subscribeChannelWithRetry(() =>
        supabase
          .channel(`pm_sent_${myUid}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "pm_messages",
              filter: `sender_uid=eq.${myUid}`,
            },
            handleInsert,
          ),
      );

      unsubReceived = subscribeChannelWithRetry(() =>
        supabase
          .channel(`pm_received_${myUid}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "pm_messages",
              filter: `receiver_uid=eq.${myUid}`,
            },
            handleInsert,
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "pm_messages",
              filter: `sender_uid=eq.${myUid}`,
            },
            handleReadReceiptUpdate,
          ),
      );
    }

    return () => {
      cancelled = true;
      unsubSent?.();
      unsubReceived?.();
      unsubSpy?.();
    };
  }, [
    currentUser.authProvider,
    currentUser.nickname,
    currentUser.role,
    currentUser.uid,
    isSpyMode,
  ]);

  useEffect(() => {
    if (!isPmOpen || !pmTarget || !currentUser.uid) return;

    if (markReadTimerRef.current) {
      clearTimeout(markReadTimerRef.current);
    }

    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null;
      const unreadIds = (pmThreads[pmTarget.nickname] || [])
        .filter((msg) => !msg.isOwn && msg.dbId)
        .map((msg) => msg.dbId as string)
        .filter((id) => !markedReadIdsRef.current.has(id));

      if (unreadIds.length === 0) return;

      unreadIds.forEach((id) => markedReadIdsRef.current.add(id));
      trimMarkedReadSet(markedReadIdsRef.current);

      void markPrivateMessagesAsRead(unreadIds).catch((error) => {
        unreadIds.forEach((id) => markedReadIdsRef.current.delete(id));
        console.warn("Failed to mark PM as read:", error);
      });
    }, 350);

    return () => {
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
        markReadTimerRef.current = null;
      }
    };
  }, [currentUser.uid, isPmOpen, pmTarget?.nickname, pmMessages.length, pmThreads]);

  return {
    pmTarget,
    setPmTarget,
    pmThreads,
    setPmThreads,
    activePmNickname,
    pmMessages,
    pmInputText,
    setPmInputText,
    isPmTyping,
  };
}

export default usePrivateMessages;
