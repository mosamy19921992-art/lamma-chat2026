import { useCallback, useEffect, useMemo, useState } from "react";
import { ROOMS_DEF } from "../lib/chatConstants";
import type { BanInfo, CustomRoomEntry, UserSession } from "../lib/chatTypes";
import { storage } from "../lib/storage";
import { supabase } from "../lib/supabase";
import {
  fetchPrivateChatRooms,
  isRoomUnlockedLocally,
  privateRoomToEntry,
} from "../services/chat/privateRoomService";
import { appendInviteParam } from "../lib/inviteAccess";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";

const POSTS_ROOM_ID = "posts-feed";

type OpenRoomTab = { id: string; name: string; flag: string };

function readStoredCustomRoomIds(storageKey: string): string[] {
  try {
    const parsed = storage.get<CustomRoomEntry[]>(storageKey, []);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((room) => room?.id?.trim().toLowerCase())
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

function readRequestedRoomId(storageKey: string): string {
  if (typeof window === "undefined") return "egypt";
  const requestedRoom = new URLSearchParams(window.location.search)
    .get("room")
    ?.trim()
    .toLowerCase();
  const roomId = requestedRoom || "egypt";
  const exists =
    ROOMS_DEF.some((room) => room.id === roomId) ||
    readStoredCustomRoomIds(storageKey).includes(roomId);
  return exists ? roomId : "egypt";
}

function buildInitialOpenRooms(roomId: string): OpenRoomTab[] {
  const defaultTab = { id: "egypt", name: "مصر", flag: "🇪🇬" };
  if (roomId === "egypt") return [defaultTab];

  const requested = ROOMS_DEF.find((room) => room.id === roomId);
  if (!requested) return [defaultTab];

  return [
    defaultTab,
    { id: requested.id, name: requested.name, flag: requested.icon },
  ];
}

function buildRoomLink(roomId: string, inviteOnlyMode: boolean): string {
  if (typeof window === "undefined") return "/";
  const base =
    (import.meta.env.VITE_APP_URL || "").trim() ||
    window.location.origin ||
    "/";
  const url = new URL(
    base,
    window.location.origin || "https://lamma-arabic-chat-room.vercel.app",
  );
  url.searchParams.set("room", roomId || "egypt");
  const link = url.toString();
  return inviteOnlyMode ? appendInviteParam(link) : link;
}

interface UseRoomNavigationOptions {
  currentUser: UserSession;
  customRoomsStorageKey: string;
  bannedUsersList: BanInfo[];
  isOwnerRole: boolean;
  isAdminRole: boolean;
  inviteOnlyMode?: boolean;
  onAfterSwitch?: () => void;
}

export function useRoomNavigation({
  currentUser,
  customRoomsStorageKey,
  bannedUsersList,
  isOwnerRole,
  isAdminRole,
  inviteOnlyMode = false,
  onAfterSwitch,
}: UseRoomNavigationOptions) {
  const [openRooms, setOpenRooms] = useState<OpenRoomTab[]>(() =>
    buildInitialOpenRooms(readRequestedRoomId(customRoomsStorageKey)),
  );
  const [customRooms, setCustomRooms] = useState<CustomRoomEntry[]>(() => {
    try {
      return storage.get<CustomRoomEntry[]>(customRoomsStorageKey, []);
    } catch {
      return [];
    }
  });
  const [activeRoomId, setActiveRoomId] = useState(() =>
    readRequestedRoomId(customRoomsStorageKey),
  );
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRoomPasswordModalOpen, setIsRoomPasswordModalOpen] = useState(false);
  const [pendingRoomSwitchId, setPendingRoomSwitchId] = useState<string | null>(
    null,
  );
  const [myPrivateRoomCount, setMyPrivateRoomCount] = useState(0);

  const availableRooms = useMemo(
    () => [...ROOMS_DEF, ...customRooms],
    [customRooms],
  );

  const isPostsRoom = activeRoomId === POSTS_ROOM_ID;
  const isAdminRoom = activeRoomId === "admin";
  const isHelpRoom = activeRoomId === "help";
  const isGamesRoom = activeRoomId === "games";
  const appLink = buildRoomLink(activeRoomId, inviteOnlyMode);

  const activeOpenRoom = openRooms.find((room) => room.id === activeRoomId);
  const activeRoomMeta =
    availableRooms.find((room) => room.id === activeRoomId) ||
    ROOMS_DEF.find((room) => room.id === activeRoomId);
  const activeRoomDisplayName =
    activeRoomId === "owner"
      ? "غرفة القيادة"
      : activeOpenRoom?.name || activeRoomMeta?.name || activeRoomId;
  const activeRoomDisplayIcon =
    activeRoomId === "owner"
      ? "👑"
      : activeOpenRoom?.flag || activeRoomMeta?.icon || "";

  useEffect(() => {
    storage.set(customRoomsStorageKey, customRooms);
  }, [customRooms, customRoomsStorageKey]);

  useEffect(() => {
    const requestedRoomExists = availableRooms.some((room) => room.id === activeRoomId);
    if (!requestedRoomExists) {
      setActiveRoomId("egypt");
    }
  }, [activeRoomId, availableRooms]);

  useEffect(() => {
    const roomDef = ROOMS_DEF.find((room) => room.id === activeRoomId);
    if (!roomDef) return;

    setOpenRooms((prev) => {
      if (prev.some((room) => room.id === activeRoomId)) return prev;
      return [...prev, { id: roomDef.id, name: roomDef.name, flag: roomDef.icon }];
    });
  }, [activeRoomId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", activeRoomId || "egypt");
    window.history.replaceState({}, "", url.toString());
  }, [activeRoomId]);

  const refreshPrivateRooms = useCallback(async () => {
    const rows = await fetchPrivateChatRooms();
    const entries = rows.map(privateRoomToEntry);
    setCustomRooms(entries);
    if (currentUser.uid) {
      setMyPrivateRoomCount(
        rows.filter((row) => row.owner_uid === currentUser.uid).length,
      );
    }
  }, [currentUser.uid]);

  useEffect(() => {
    void refreshPrivateRooms();
  }, [refreshPrivateRooms]);

  useEffect(() => {
    if (!supabase) return;
    let isCancelled = false;
    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("private_chat_rooms_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "private_chat_rooms" },
          () => {
            if (!isCancelled) void refreshPrivateRooms();
          },
        ),
    );
    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, [refreshPrivateRooms]);

  const handleSwitchRoom = useCallback(
    (roomId: string) => {
      const isBanned = bannedUsersList.some(
        (ban) =>
          ban.nickname.toLowerCase() === currentUser.nickname.toLowerCase() &&
          (ban.type === "room" || ban.type === "kick") &&
          ban.roomId === roomId,
      );
      if (isBanned) {
        alert(
          "🚫 تنبيه الغرف: عذراً! أنت محظور من دخول هذه الغرفة بقرار إداري من قبل المشرفين.",
        );
        return;
      }

      const roleLower = (currentUser.role || "").toLowerCase();
      const isOwner = roleLower === "owner";
      const isAdmin = roleLower === "admin" || isOwner;

      if (roomId === "admin" && !isAdmin) {
        alert(
          "🛡️ غرفة الإدارة متاحة للمشرفين والمالك فقط. للشكاوى: ادخل غرفة «مساعدة وشكاوى» 📋",
        );
        return;
      }

      if (roomId === "owner" && !isOwner) {
        alert("🎨 غرفة بوت التصميم متاحة للمالك فقط.");
        return;
      }

      const privateRoom = customRooms.find((room) => room.id === roomId);
      if (privateRoom?.isLocked) {
        const isRoomOwner = privateRoom.ownerUid === currentUser.uid;
        const isPrivileged = isOwnerRole || isAdminRole || isRoomOwner;
        if (!isPrivileged && !isRoomUnlockedLocally(roomId)) {
          setPendingRoomSwitchId(roomId);
          setIsRoomPasswordModalOpen(true);
          return;
        }
      }

      setActiveRoomId(roomId);
      onAfterSwitch?.();
    },
    [
      bannedUsersList,
      currentUser.nickname,
      currentUser.role,
      currentUser.uid,
      customRooms,
      isAdminRole,
      isOwnerRole,
      onAfterSwitch,
    ],
  );

  return {
    POSTS_ROOM_ID,
    openRooms,
    setOpenRooms,
    customRooms,
    setCustomRooms,
    activeRoomId,
    setActiveRoomId,
    availableRooms,
    isPostsRoom,
    isAdminRoom,
    isHelpRoom,
    isGamesRoom,
    appLink,
    activeOpenRoom,
    activeRoomMeta,
    activeRoomDisplayName,
    activeRoomDisplayIcon,
    isCreateRoomModalOpen,
    setIsCreateRoomModalOpen,
    isCreatingRoom,
    setIsCreatingRoom,
    isRoomPasswordModalOpen,
    setIsRoomPasswordModalOpen,
    pendingRoomSwitchId,
    setPendingRoomSwitchId,
    myPrivateRoomCount,
    setMyPrivateRoomCount,
    refreshPrivateRooms,
    handleSwitchRoom,
  };
}
