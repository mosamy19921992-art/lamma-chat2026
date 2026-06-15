import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PMTargetState, PMThreadMessage, UserSession } from "../lib/chatTypes";

interface UsePrivateMessagesOptions {
  currentUser: UserSession;
  isSpyMode: boolean;
  isPmOpen: boolean;
  playMessageSound?: () => void;
}

function formatPmTime(createdAt?: string) {
  const date = createdAt ? new Date(createdAt) : new Date();
  return date.toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function usePrivateMessages({
  currentUser,
  isSpyMode,
  isPmOpen,
  playMessageSound,
}: UsePrivateMessagesOptions) {
  const [pmTarget, setPmTarget] = useState<PMTargetState | null>(null);
  const [pmInputText, setPmInputText] = useState("");
  const [isPmTyping, setIsPmTyping] = useState(false);
  const pmThreadsStorageKey = `lamma_pm_threads_${currentUser.uid || currentUser.nickname}`;
  const [pmThreads, setPmThreads] = useState<Record<string, PMThreadMessage[]>>(
    () => {
      const fallbackThreads: Record<string, PMThreadMessage[]> = {};
      const saved = localStorage.getItem(pmThreadsStorageKey);
      if (!saved) return fallbackThreads;
      try {
        return JSON.parse(saved);
      } catch {
        return fallbackThreads;
      }
    },
  );

  const activePmNickname = pmTarget?.nickname || "";
  const pmMessages = useMemo(
    () => (activePmNickname ? pmThreads[activePmNickname] || [] : []),
    [activePmNickname, pmThreads],
  );

  useEffect(() => {
    const trimmedThreads: Record<string, PMThreadMessage[]> = {};
    Object.keys(pmThreads).forEach((user) => {
      trimmedThreads[user] = pmThreads[user].slice(-100);
    });
    localStorage.setItem(pmThreadsStorageKey, JSON.stringify(trimmedThreads));
  }, [pmThreads, pmThreadsStorageKey]);

  useEffect(() => {
    if (isPmOpen && pmTarget) {
      const t = setTimeout(() => setIsPmTyping(true), 2000);
      const t2 = setTimeout(() => setIsPmTyping(false), 6000);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [isPmOpen, pmMessages.length, pmTarget]);

  useEffect(() => {
    if (!supabase || currentUser.authProvider !== "supabase" || !currentUser.uid) {
      return;
    }

    const fetchDatabasePMs = async () => {
      const myUid = currentUser.uid;
      const myNick = currentUser.nickname;

      let query = supabase.from("pm_messages").select("*");
      if (!(currentUser.role === "owner" && isSpyMode)) {
        query = query.or(
          `sender_uid.eq.${myUid},receiver_uid.eq.${myUid},sender_nickname.eq.${myNick},receiver_nickname.eq.${myNick}`,
        );
      }
      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching database PMs:", error);
        return;
      }

      if (data && data.length > 0) {
        setPmThreads((prev) => {
          const next = { ...prev };
          data.forEach((sMsg: any) => {
            const isOwn =
              sMsg.sender_nickname === currentUser.nickname ||
              sMsg.sender_uid === myUid;

            let otherPerson = isOwn
              ? sMsg.receiver_nickname
              : sMsg.sender_nickname;

            if (
              currentUser.role === "owner" &&
              isSpyMode &&
              !isOwn &&
              sMsg.receiver_nickname !== myNick &&
              sMsg.receiver_uid !== myUid
            ) {
              otherPerson = `🕵️ ${sMsg.sender_nickname} -> ${sMsg.receiver_nickname}`;
            }

            if (!next[otherPerson]) {
              next[otherPerson] = [];
            }

            const exists = next[otherPerson].some(
              (m) =>
                (m as any).dbId === sMsg.id ||
                (m.text === sMsg.text && m.isOwn === isOwn),
            );

            if (!exists) {
              next[otherPerson].push({
                text: sMsg.text,
                isOwn,
                time: formatPmTime(sMsg.created_at),
                status: "read",
                dbId: sMsg.id,
              } as any);
            }
          });
          return next;
        });
      }
    };

    void fetchDatabasePMs();

    const myUid = currentUser.uid;
    const myNick = currentUser.nickname;

    const pmSubscription = supabase
      .channel("pm_realtime_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pm_messages",
        },
        (payload) => {
          const sMsg = payload.new as any;
          const isSender =
            sMsg.sender_nickname === myNick || sMsg.sender_uid === myUid;
          const isReceiver =
            sMsg.receiver_nickname === myNick || sMsg.receiver_uid === myUid;

          const spyIntercept =
            currentUser.role === "owner" && isSpyMode && !isSender && !isReceiver;

          if (isSender || isReceiver || spyIntercept) {
            let otherPerson = isSender
              ? sMsg.receiver_nickname
              : sMsg.sender_nickname;

            if (spyIntercept) {
              otherPerson = `🕵️ ${sMsg.sender_nickname} -> ${sMsg.receiver_nickname}`;
            }

            setPmThreads((prev) => {
              const currentThread = prev[otherPerson] || [];
              const exists = currentThread.some(
                (m) =>
                  (m as any).dbId === sMsg.id ||
                  (m.text === sMsg.text && m.isOwn === isSender),
              );

              if (exists) return prev;

              const nextThread = [
                ...currentThread,
                {
                  text: sMsg.text,
                  isOwn: isSender,
                  time: formatPmTime(sMsg.created_at),
                  status: "read",
                  dbId: sMsg.id,
                } as any,
              ];

              return {
                ...prev,
                [otherPerson]: nextThread.slice(-100),
              };
            });

            if (!isSender && document.hidden) {
              playMessageSound?.();
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pmSubscription);
    };
  }, [
    currentUser,
    currentUser.authProvider,
    currentUser.nickname,
    currentUser.role,
    currentUser.uid,
    isSpyMode,
    playMessageSound,
  ]);

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
