import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMember, UserSession } from "../lib/chatTypes";
import { supabase } from "../lib/supabase";

interface PresenceMeta {
  uid: string;
  nickname: string;
  role: string;
  color: string;
  avatar: string;
  fingerprint: string;
  browserSignature: string;
  authProvider?: string;
}

export interface PresenceUpdateEvent {
  type: "sync" | "join" | "leave";
  nickname?: string;
  onlineCount: number;
}

/** Shared Realtime channel name — all clients in the same room must use the same string. */
export function presenceChannelName(roomId: string) {
  return `lamma_presence_${roomId || "egypt"}`;
}

interface UseOnlinePresenceOptions {
  roomId: string;
  currentUser: UserSession;
  /** Role broadcast in presence (may include room-scoped elevation). */
  presenceRole: string;
  displayNickname: string;
  displayAvatar: string;
  displayColor: string;
  isGhostMode: boolean;
  myFingerprint: string;
  myBrowserSig: string;
  setChatMembers: Dispatch<SetStateAction<ChatMember[]>>;
  normalizeRole: (role: string | undefined) => ChatMember["role"];
  onPresenceUpdate?: (event: PresenceUpdateEvent) => void;
}

function presenceToMember(
  p: PresenceMeta,
  normalizeRole: (role: string | undefined) => ChatMember["role"],
): ChatMember {
  return {
    id: p.uid,
    nickname: p.nickname,
    role: normalizeRole(p.role),
    color: p.color || "#10b981",
    avatar: p.avatar || "👤",
    status: "online",
    fingerprint: p.fingerprint || "",
    browserSignature: p.browserSignature || "",
    ip: "",
    localStorageId: `presence-${p.uid}`,
  };
}

/** Sync online members via Supabase Realtime Presence (registered + guest sessions). */
export function useOnlinePresence({
  roomId,
  currentUser,
  presenceRole,
  displayNickname,
  displayAvatar,
  displayColor,
  isGhostMode,
  myFingerprint,
  myBrowserSig,
  setChatMembers,
  normalizeRole,
  onPresenceUpdate,
}: UseOnlinePresenceOptions) {
  useEffect(() => {
    if (!supabase || !currentUser.uid || isGhostMode || !roomId) {
      return;
    }

    setChatMembers((prev) => {
      const existingSelf = prev.find((member) => member.id === currentUser.uid);
      if (existingSelf) return [existingSelf];
      return [
        {
          id: currentUser.uid,
          nickname: displayNickname,
          role: normalizeRole(
            typeof presenceRole === "string" ? presenceRole : undefined,
          ),
          color: displayColor || "#10b981",
          avatar: displayAvatar || "👤",
          status: "online" as const,
          email: currentUser.email || undefined,
          fingerprint: myFingerprint,
          browserSignature: myBrowserSig,
          ip: "",
          localStorageId: `local-${currentUser.uid}`,
        },
      ];
    });

    const myUid = currentUser.uid;
    const channelName = presenceChannelName(roomId);
    let lastEvent: PresenceUpdateEvent["type"] = "sync";
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const attach = () => {
      if (stopped || !supabase) return;

      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }

      const channel = supabase.channel(channelName, {
        config: { presence: { key: myUid } },
      });
      activeChannel = channel;

      let prevMembersByUid = new Map<string, string>();
      let isInitialPresenceSync = true;
      let lastTickerFlash: { type: "join" | "leave"; nick: string; at: number } | null =
        null;

      const emitUpdate = (
        type: PresenceUpdateEvent["type"],
        nickname?: string,
      ) => {
        lastEvent = type;
        const state = channel.presenceState<PresenceMeta>();
        const count = Object.keys(state).length;
        onPresenceUpdate?.({
          type,
          nickname,
          onlineCount: Math.max(count, 1),
        });
      };

      const flashTicker = (type: "join" | "leave", nickname: string) => {
        const now = Date.now();
        if (
          lastTickerFlash?.type === type &&
          lastTickerFlash.nick === nickname &&
          now - lastTickerFlash.at < 2500
        ) {
          return;
        }
        lastTickerFlash = { type, nick: nickname, at: now };
        emitUpdate(type, nickname);
      };

      const syncFromPresence = () => {
        const state = channel.presenceState<PresenceMeta>();
        const byUid = new Map<string, ChatMember>();

        Object.values(state).forEach((entries) => {
          (entries as PresenceMeta[]).forEach((meta) => {
            if (meta?.uid && meta?.nickname) {
              byUid.set(meta.uid, presenceToMember(meta, normalizeRole));
            }
          });
        });

        if (!byUid.has(myUid)) {
          byUid.set(myUid, {
            id: myUid,
            nickname: displayNickname,
            role: normalizeRole(
              typeof presenceRole === "string" ? presenceRole : undefined,
            ),
            color: displayColor || "#10b981",
            avatar: displayAvatar || "👤",
            status: "online",
            email: currentUser.email || undefined,
            fingerprint: myFingerprint,
            browserSignature: myBrowserSig,
            ip: "",
            localStorageId: `local-${myUid}`,
          });
        }

        const nextMembers = Array.from(byUid.values());
        const nextMembersByUid = new Map(
          nextMembers.map((member) => [member.id, member.nickname]),
        );

        if (syncTimer) {
          clearTimeout(syncTimer);
        }
        syncTimer = setTimeout(() => {
          if (stopped) return;

          if (!isInitialPresenceSync) {
            for (const [uid, nickname] of nextMembersByUid) {
              if (!prevMembersByUid.has(uid) && uid !== myUid) {
                flashTicker("join", nickname);
              }
            }
            for (const [uid, nickname] of prevMembersByUid) {
              if (!nextMembersByUid.has(uid) && uid !== myUid) {
                flashTicker("leave", nickname);
              }
            }
          } else {
            isInitialPresenceSync = false;
          }

          prevMembersByUid = nextMembersByUid;
          setChatMembers(nextMembers);
          emitUpdate("sync");
        }, 180);
      };

      channel
        .on("presence", { event: "sync" }, () => syncFromPresence())
        .on("presence", { event: "join" }, ({ newPresences }) => {
          const joined = (newPresences as unknown as PresenceMeta[])[0];
          syncFromPresence();
          if (joined?.nickname && joined.uid !== myUid) {
            flashTicker("join", joined.nickname);
          }
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          const left = (leftPresences as unknown as PresenceMeta[])[0];
          syncFromPresence();
          if (left?.nickname && left.uid !== myUid) {
            flashTicker("leave", left.nickname);
          }
        })
        .subscribe(async (status, err) => {
          if (stopped) return;

          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                uid: myUid,
                nickname: displayNickname,
                role: presenceRole,
                color: displayColor || "#10b981",
                avatar: displayAvatar || "👤",
                fingerprint: myFingerprint,
                browserSignature: myBrowserSig,
                authProvider: currentUser.authProvider,
              } satisfies PresenceMeta);
            } catch (trackError) {
              console.warn("Presence track failed:", trackError);
            }
            syncFromPresence();
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("Presence channel error:", status, err);
            onPresenceUpdate?.({
              type: lastEvent,
              onlineCount: 1,
            });
            if (activeChannel) {
              void supabase.removeChannel(activeChannel);
              activeChannel = null;
            }
            retryTimer = setTimeout(attach, 2500);
          }
        });
    };

    attach();

    return () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      if (activeChannel) {
        void activeChannel.untrack();
        supabase.removeChannel(activeChannel);
      }
    };
  }, [
    roomId,
    currentUser.authProvider,
    currentUser.email,
    currentUser.uid,
    presenceRole,
    displayAvatar,
    displayColor,
    displayNickname,
    isGhostMode,
    myBrowserSig,
    myFingerprint,
    normalizeRole,
    onPresenceUpdate,
    setChatMembers,
  ]);
}
