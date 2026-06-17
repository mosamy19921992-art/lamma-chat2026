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

    const myUid = currentUser.uid;
    const channelName = presenceChannelName(roomId);
    let lastEvent: PresenceUpdateEvent["type"] = "sync";
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const attach = () => {
      if (stopped || !supabase) return;

      const channel = supabase.channel(channelName, {
        config: { presence: { key: myUid } },
      });
      activeChannel = channel;

      const emitUpdate = (
        type: PresenceUpdateEvent["type"],
        nickname?: string,
      ) => {
        lastEvent = type;
        const state = channel.presenceState<PresenceMeta>();
        let count = 0;
        Object.values(state).forEach((entries) => {
          count += (entries as PresenceMeta[]).length;
        });
        onPresenceUpdate?.({
          type,
          nickname,
          onlineCount: Math.max(count, 1),
        });
      };

      const syncFromPresence = (
        eventType: PresenceUpdateEvent["type"] = "sync",
      ) => {
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
              typeof currentUser.role === "string"
                ? currentUser.role
                : undefined,
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

        setChatMembers(Array.from(byUid.values()));
        emitUpdate(eventType);
      };

      channel
        .on("presence", { event: "sync" }, () => syncFromPresence("sync"))
        .on("presence", { event: "join" }, ({ newPresences }) => {
          const joined = (newPresences as unknown as PresenceMeta[])[0];
          syncFromPresence("join");
          if (joined?.nickname && joined.uid !== myUid) {
            onPresenceUpdate?.({
              type: "join",
              nickname: joined.nickname,
              onlineCount: Object.keys(channel.presenceState()).length,
            });
          }
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          const left = (leftPresences as unknown as PresenceMeta[])[0];
          syncFromPresence("leave");
          if (left?.nickname && left.uid !== myUid) {
            onPresenceUpdate?.({
              type: "leave",
              nickname: left.nickname,
              onlineCount: Math.max(
                Object.keys(channel.presenceState()).length,
                1,
              ),
            });
          }
        })
        .subscribe(async (status, err) => {
          if (stopped) return;

          if (status === "SUBSCRIBED") {
            await channel.track({
              uid: myUid,
              nickname: displayNickname,
              role: currentUser.role,
              color: displayColor || "#10b981",
              avatar: displayAvatar || "👤",
              fingerprint: myFingerprint,
              browserSignature: myBrowserSig,
              authProvider: currentUser.authProvider,
            } satisfies PresenceMeta);
            syncFromPresence("sync");
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
      if (activeChannel) {
        void activeChannel.untrack();
        supabase.removeChannel(activeChannel);
      }
    };
  }, [
    roomId,
    currentUser.authProvider,
    currentUser.email,
    currentUser.role,
    currentUser.uid,
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
