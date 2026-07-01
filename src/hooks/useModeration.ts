import { useCallback, useEffect, useState } from "react";
import type { BanInfo, UserSession } from "../lib/chatTypes";
import { supabase, type BannedUserRow } from "../lib/supabase";
import { formatSupabaseUserError } from "../lib/supabaseErrors";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";
import {
  applyModerationAction,
  banActionForType,
  deleteBannedUsersByIds,
  fetchBannedUserRows,
  fetchMyActiveSanctions,
  insertBannedUserRow,
  mapBannedUserRowToBanInfo,
} from "../services/chat/moderationService";

const BANNED_LIST_STORAGE_KEY = "lamma_banned_list";
const BANNED_USER_REASON_PREFIX = "lamma-ban-json:";
const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value?: string | null): value is string {
  return Boolean(value && UUID_LIKE_PATTERN.test(value));
}

function createBanSignature(ban: Partial<BanInfo>): string {
  return [
    (ban.type || "ban").toLowerCase(),
    (ban.roomId || "").toLowerCase(),
    (ban.nickname || "").trim().toLowerCase(),
    (ban.fingerprint || "").trim().toLowerCase(),
    (ban.ip || "").trim().toLowerCase(),
  ].join("|");
}

function mergeBanLists(existing: BanInfo[], incoming: BanInfo[]): BanInfo[] {
  const merged = new Map<string, BanInfo>();
  [...existing, ...incoming].forEach((ban) => {
    merged.set(createBanSignature(ban), ban);
  });
  return Array.from(merged.values());
}

function serializeBanRowReason(ban: BanInfo): string {
  return `${BANNED_USER_REASON_PREFIX}${JSON.stringify({
    nickname: ban.nickname,
    email: ban.email || "",
    fingerprint: ban.fingerprint || "",
    browserSignature: ban.browserSignature || "",
    ip: ban.ip || "",
    localStorageId: ban.localStorageId || "",
    type: ban.type,
    roomId: ban.roomId || "",
    banner: ban.banner,
    reason: ban.reason,
    time: ban.time,
  })}`;
}

function parseBannedUserRow(row: BannedUserRow): BanInfo {
  return mapBannedUserRowToBanInfo(row);
}

function resolveBanTargetUserId(ban: BanInfo): string | null {
  if (isUuidLike(ban.localStorageId)) return ban.localStorageId;
  if (isUuidLike(ban.fingerprint)) return ban.fingerprint;
  return null;
}

function readInitialBannedList(): BanInfo[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(BANNED_LIST_STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as BanInfo[];
  } catch {
    return [];
  }
}

function readDeviceFingerprint(): string {
  if (typeof window === "undefined") return "fp-server";
  let fp = localStorage.getItem("lamma_device_fp");
  if (!fp) {
    fp =
      "fp-" +
      Math.floor(Math.random() * 900000 + 100000).toString(16) +
      "-" +
      Math.floor(Math.random() * 9000 + 1000);
    localStorage.setItem("lamma_device_fp", fp);
  }
  return fp;
}

interface UseModerationOptions {
  currentUser: UserSession;
  getActiveRoomId: () => string;
}

export function useModeration({
  currentUser,
  getActiveRoomId,
}: UseModerationOptions) {
  const [bannedUsersList, setBannedUsersList] =
    useState<BanInfo[]>(readInitialBannedList);
  const [myFingerprint] = useState(readDeviceFingerprint);
  const [myBrowserSig] = useState(
    () =>
      (typeof navigator !== "undefined" && navigator.userAgent) ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0",
  );
  const myIp = "غير متاح";

  const [isCurrentlyBanned, setIsCurrentlyBanned] = useState(false);
  const [banRecheckLoading, setBanRecheckLoading] = useState(false);
  const [banDetails, setBanDetails] = useState<BanInfo | null>(null);

  const canSyncModerationToSupabase = Boolean(
    supabase &&
      currentUser.authProvider === "supabase" &&
      currentUser.uid &&
      (currentUser.role === "owner" || currentUser.role === "admin"),
  );

  useEffect(() => {
    if (!supabase || !currentUser.uid || currentUser.authProvider !== "supabase") {
      return;
    }
    let cancelled = false;
    void fetchMyActiveSanctions().then((sanctions) => {
      if (cancelled || sanctions.length === 0) return;
      setBannedUsersList((prev) => mergeBanLists(prev, sanctions));
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, currentUser.authProvider]);

  useEffect(() => {
    localStorage.setItem(BANNED_LIST_STORAGE_KEY, JSON.stringify(bannedUsersList));
  }, [bannedUsersList]);

  useEffect(() => {
    if (!supabase) return;

    let isCancelled = false;

    const fetchSyncedBans = async () => {
      const data = await fetchBannedUserRows();
      if (!data.length || isCancelled) return;

      setBannedUsersList((prev) =>
        mergeBanLists(
          prev,
          data.map((row) => parseBannedUserRow(row)),
        ),
      );
    };

    void fetchSyncedBans();

    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("banned_users_sync")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "banned_users" },
          (payload) => {
            if (isCancelled) return;
            setBannedUsersList((prev) =>
              mergeBanLists(prev, [
                parseBannedUserRow(payload.new as BannedUserRow),
              ]),
            );
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "banned_users" },
          (payload) => {
            if (isCancelled) return;
            const updated = parseBannedUserRow(payload.new as BannedUserRow);
            setBannedUsersList((prev) =>
              mergeBanLists(
                prev.filter((ban) => ban.id !== updated.id),
                [updated],
              ),
            );
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "banned_users" },
          (payload) => {
            if (isCancelled) return;
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (!deletedId) return;
            setBannedUsersList((prev) =>
              prev.filter((ban) => ban.id !== deletedId),
            );
          },
        ),
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const isGuest =
      currentUser.nickname.startsWith("LammaGuest") ||
      currentUser.nickname.startsWith("LC-Guest") ||
      currentUser.nickname.startsWith("LC_Guest") ||
      currentUser.nickname.includes("زائر") ||
      currentUser.nickname.includes("Guest");
    const activeEmail = isGuest ? undefined : currentUser.email || undefined;

    const matchedBan = bannedUsersList.find((b) => {
      if (b.type === "megaban") {
        return (
          b.nickname.toLowerCase() === currentUser.nickname.toLowerCase() ||
          (activeEmail &&
            b.email &&
            b.email.toLowerCase() === activeEmail.toLowerCase()) ||
          b.fingerprint === myFingerprint ||
          b.browserSignature === myBrowserSig ||
          b.ip === myIp
        );
      }
      if (b.type === "ban") {
        return b.nickname.toLowerCase() === currentUser.nickname.toLowerCase();
      }
      return false;
    });

    if (matchedBan) {
      setIsCurrentlyBanned(true);
      setBanDetails(matchedBan);
    } else {
      setIsCurrentlyBanned(false);
      setBanDetails(null);
    }
  }, [bannedUsersList, currentUser, myFingerprint, myBrowserSig, myIp]);

  const addBanEntry = useCallback(
    async (
      ban: BanInfo,
      options?: { sync?: boolean },
    ): Promise<{ ok: boolean; error?: string }> => {
      if (options?.sync && supabase && currentUser.authProvider === "supabase") {
        const serverAction = banActionForType(ban.type, false);
        if (
          serverAction === "mute" ||
          serverAction === "room_ban" ||
          serverAction === "megaban" ||
          serverAction === "kick" ||
          serverAction === "shadow"
        ) {
          const result = await applyModerationAction({
            action: serverAction,
            targetUserId: resolveBanTargetUserId(ban),
            targetNickname: ban.nickname,
            roomId: ban.roomId || getActiveRoomId(),
            reason: ban.reason,
          });
          if (!result.ok) {
            return {
              ok: false,
              error: result.error || "تعذر تنفيذ الإجراء على السيرفر.",
            };
          }
          setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
          return { ok: true };
        }
      }

      if (!options?.sync) {
        setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
        return { ok: true };
      }

      if (!supabase || !canSyncModerationToSupabase) {
        setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
        return { ok: true };
      }

      const payload: BannedUserRow = {
        uid:
          ban.fingerprint ||
          ban.localStorageId ||
          ban.nickname.trim().toLowerCase(),
        author: ban.nickname,
        banner: ban.banner,
        reason: serializeBanRowReason(ban),
        ban_type: ban.type,
        room_id: ban.roomId || null,
        target_user_id: resolveBanTargetUserId(ban),
      };

      const { data, error: insertError } = await insertBannedUserRow(payload);

      if (insertError) {
        console.warn("Failed to sync ban entry to Supabase", insertError);
        return {
          ok: false,
          error: formatSupabaseUserError(
            insertError,
            "تعذر مزامنة الحظر مع السيرفر.",
          ),
        };
      }

      if (data) {
        setBannedUsersList((prev) =>
          mergeBanLists(prev, [parseBannedUserRow(data)]),
        );
      } else {
        setBannedUsersList((prev) => mergeBanLists(prev, [ban]));
      }
      return { ok: true };
    },
    [canSyncModerationToSupabase, currentUser.authProvider, getActiveRoomId],
  );

  const removeBanEntries = useCallback(
    async (
      matcher: (ban: BanInfo) => boolean,
      options?: { sync?: boolean },
    ): Promise<{ ok: boolean; error?: string }> => {
      let removedEntries: BanInfo[] = [];
      setBannedUsersList((prev) => {
        removedEntries = prev.filter(matcher);
        return options?.sync ? prev : prev.filter((ban) => !matcher(ban));
      });

      if (!options?.sync || !supabase) {
        if (!options?.sync) {
          return { ok: true };
        }
        setBannedUsersList((prev) => prev.filter((ban) => !matcher(ban)));
        return { ok: true };
      }

      for (const ban of removedEntries) {
        const serverAction = banActionForType(ban.type, true);
        if (
          serverAction === "unmute" ||
          serverAction === "unroom_ban" ||
          serverAction === "unmegaban" ||
          serverAction === "unkick" ||
          serverAction === "unshadow"
        ) {
          const result = await applyModerationAction({
            action: serverAction,
            targetUserId: resolveBanTargetUserId(ban),
            targetNickname: ban.nickname,
            roomId: ban.roomId || getActiveRoomId(),
            reason: ban.reason,
          });
          if (!result.ok) {
            return {
              ok: false,
              error: result.error || "تعذر إلغاء الإجراء على السيرفر.",
            };
          }
        }
      }

      if (canSyncModerationToSupabase) {
        const remoteIds = removedEntries
          .map((ban) => ban.id)
          .filter((id): id is string => isUuidLike(id));

        if (remoteIds.length > 0) {
          const { error: deleteError } = await deleteBannedUsersByIds(remoteIds);

          if (deleteError) {
            return {
              ok: false,
              error: formatSupabaseUserError(
                deleteError,
                "تعذر إزالة الحظر من السيرفر.",
              ),
            };
          }
        }
      }

      setBannedUsersList((prev) => prev.filter((ban) => !matcher(ban)));
      return { ok: true };
    },
    [canSyncModerationToSupabase, getActiveRoomId],
  );

  const recheckBansFromServer = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    setBanRecheckLoading(true);
    try {
      const data = await fetchBannedUserRows();
      const serverBans = data.map((row) => parseBannedUserRow(row));
      setBannedUsersList(serverBans);
      localStorage.setItem(BANNED_LIST_STORAGE_KEY, JSON.stringify(serverBans));
      return true;
    } catch (error) {
      console.warn("Ban recheck failed", error);
      return false;
    } finally {
      setBanRecheckLoading(false);
    }
  }, []);

  return {
    bannedUsersList,
    setBannedUsersList,
    myFingerprint,
    myBrowserSig,
    myIp,
    isCurrentlyBanned,
    banDetails,
    banRecheckLoading,
    canSyncModerationToSupabase,
    addBanEntry,
    removeBanEntries,
    recheckBansFromServer,
  };
}
