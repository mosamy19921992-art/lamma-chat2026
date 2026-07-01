import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MemberCosmeticGrant,
  MemberCustomPermissions,
} from "../lib/chatTypes";
import {
  supabase,
  type OwnerMemberCosmeticsRow,
  type OwnerMemberPermissionRow,
} from "../lib/supabase";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";
import {
  deleteOwnerMemberCosmetic,
  listOwnerMemberCosmeticNicknames,
  upsertOwnerMemberCosmetics,
  upsertOwnerMemberPermissions,
} from "../services/chat/ownerDashboardService";

const PERMS_STORAGE_KEY = "lamma_custom_user_perms";
const COSMETICS_STORAGE_KEY = "lamma_member_cosmetic_grants";
const OWNER_SYNC_DEBOUNCE_MS = 350;

function readJsonRecord<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function mapPermissionRow(row: OwnerMemberPermissionRow): MemberCustomPermissions {
  return {
    recordingAllowed: Boolean(row.recording_allowed),
    callsAllowed: Boolean(row.calls_allowed),
    videoCallsAllowed: Boolean(row.video_calls_allowed),
    musicRadioAllowed: Boolean(row.music_radio_allowed),
    roomCreationAllowed: Boolean(row.room_creation_allowed),
    roomCreationQuota: Number(row.room_creation_quota) || 0,
    imagesAllowed: Boolean(row.images_allowed),
    youtubeAllowed: Boolean(row.youtube_allowed),
  };
}

function mapCosmeticRow(row: OwnerMemberCosmeticsRow): MemberCosmeticGrant | null {
  if (!row.nickname?.trim()) return null;
  if (!row.vip_tier && !row.frame) return null;
  return {
    vipTier: row.vip_tier || null,
    frame: row.frame || null,
  };
}

interface UseOwnerMemberAccessOptions {
  isManagementRole: boolean;
  isOwnerRole: boolean;
  canPersistOwnerSettings: boolean;
  ownerNickname: string;
}

export function useOwnerMemberAccess({
  isManagementRole,
  isOwnerRole,
  canPersistOwnerSettings,
  ownerNickname,
}: UseOwnerMemberAccessOptions) {
  const [memberCustomPermissions, setMemberCustomPermissions] = useState<
    Record<string, MemberCustomPermissions>
  >(() => readJsonRecord(PERMS_STORAGE_KEY, {}));

  const [memberCosmeticGrants, setMemberCosmeticGrants] = useState<
    Record<string, MemberCosmeticGrant>
  >(() => readJsonRecord(COSMETICS_STORAGE_KEY, {}));

  const permissionsSyncReadyRef = useRef(false);
  const cosmeticsSyncReadyRef = useRef(false);
  const permissionsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const cosmeticsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const permissionsAlertShownRef = useRef(false);
  const lastSyncedPermissionsRef = useRef("");
  const lastSyncedCosmeticsRef = useRef("");

  useEffect(() => {
    localStorage.setItem(PERMS_STORAGE_KEY, JSON.stringify(memberCustomPermissions));
  }, [memberCustomPermissions]);

  useEffect(() => {
    localStorage.setItem(COSMETICS_STORAGE_KEY, JSON.stringify(memberCosmeticGrants));
  }, [memberCosmeticGrants]);

  useEffect(() => {
    if (!supabase || !isManagementRole) return;
    let isCancelled = false;

    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("owner_permissions_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "owner_member_permissions" },
          (payload) => {
            if (isCancelled) return;
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const row = payload.new as OwnerMemberPermissionRow;
              if (!row.nickname?.trim()) return;
              setMemberCustomPermissions((prev) => {
                const next = {
                  ...prev,
                  [row.nickname]: mapPermissionRow(row),
                };
                lastSyncedPermissionsRef.current = JSON.stringify(next);
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as OwnerMemberPermissionRow;
              if (!row?.nickname) return;
              setMemberCustomPermissions((prev) => {
                const next = { ...prev };
                delete next[row.nickname];
                lastSyncedPermissionsRef.current = JSON.stringify(next);
                return next;
              });
            }
          },
        ),
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isManagementRole]);

  useEffect(() => {
    if (!supabase || !isManagementRole) return;
    let isCancelled = false;

    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("owner_cosmetics_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "owner_member_cosmetics" },
          (payload) => {
            if (isCancelled) return;
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const row = payload.new as OwnerMemberCosmeticsRow;
              const grant = mapCosmeticRow(row);
              if (!row.nickname?.trim()) return;
              if (!grant) {
                setMemberCosmeticGrants((prev) => {
                  const next = { ...prev };
                  delete next[row.nickname];
                  lastSyncedCosmeticsRef.current = JSON.stringify(next);
                  return next;
                });
                return;
              }
              setMemberCosmeticGrants((prev) => {
                const next = { ...prev, [row.nickname]: grant };
                lastSyncedCosmeticsRef.current = JSON.stringify(next);
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as OwnerMemberCosmeticsRow;
              if (!row?.nickname) return;
              setMemberCosmeticGrants((prev) => {
                const next = { ...prev };
                delete next[row.nickname];
                lastSyncedCosmeticsRef.current = JSON.stringify(next);
                return next;
              });
            }
          },
        ),
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isManagementRole]);

  const resetSyncReady = useCallback(() => {
    permissionsSyncReadyRef.current = false;
    cosmeticsSyncReadyRef.current = false;
  }, []);

  const markSyncReady = useCallback(() => {
    permissionsSyncReadyRef.current = true;
    cosmeticsSyncReadyRef.current = true;
  }, []);

  const applyPermissionsFromRows = useCallback(
    (rows: OwnerMemberPermissionRow[]) => {
      if (rows.length === 0) return;
      const nextPermissions = rows.reduce<Record<string, MemberCustomPermissions>>(
        (acc, row) => {
          if (!row.nickname?.trim()) return acc;
          acc[row.nickname] = mapPermissionRow(row);
          return acc;
        },
        {},
      );
      lastSyncedPermissionsRef.current = JSON.stringify(nextPermissions);
      setMemberCustomPermissions(nextPermissions);
    },
    [],
  );

  const applyCosmeticsFromRows = useCallback((rows: OwnerMemberCosmeticsRow[]) => {
    if (rows.length === 0) return;
    const nextCosmetics = rows.reduce<Record<string, MemberCosmeticGrant>>(
      (acc, row) => {
        const grant = mapCosmeticRow(row);
        if (!row.nickname?.trim() || !grant) return acc;
        acc[row.nickname] = grant;
        return acc;
      },
      {},
    );
    lastSyncedCosmeticsRef.current = JSON.stringify(nextCosmetics);
    setMemberCosmeticGrants(nextCosmetics);
  }, []);

  useEffect(() => {
    if (!permissionsSyncReadyRef.current || !supabase || !canPersistOwnerSettings) {
      return;
    }

    if (permissionsSyncTimeoutRef.current) {
      clearTimeout(permissionsSyncTimeoutRef.current);
    }

    permissionsSyncTimeoutRef.current = setTimeout(async () => {
      const snapshot = JSON.stringify(memberCustomPermissions);
      if (snapshot === lastSyncedPermissionsRef.current) return;

      const rows: OwnerMemberPermissionRow[] = Object.entries(
        memberCustomPermissions,
      ).map(([nickname, permissions]) => ({
        nickname,
        updated_by: ownerNickname,
        recording_allowed: permissions.recordingAllowed,
        calls_allowed: permissions.callsAllowed,
        video_calls_allowed: permissions.videoCallsAllowed,
        music_radio_allowed: permissions.musicRadioAllowed,
        room_creation_allowed: permissions.roomCreationAllowed,
        room_creation_quota: permissions.roomCreationQuota,
        images_allowed: permissions.imagesAllowed,
        youtube_allowed: permissions.youtubeAllowed,
      }));

      if (rows.length === 0) return;

      const { error } = await upsertOwnerMemberPermissions(rows);

      if (error) {
        console.warn("Failed to sync owner member permissions", error);
        if (isOwnerRole && !permissionsAlertShownRef.current) {
          permissionsAlertShownRef.current = true;
          alert(
            `⚠️ تعذر حفظ صلاحيات الأعضاء على السيرفر: ${error.message}\n` +
              "تحقق من user_roles (role=owner) وسياسات RLS على owner_member_permissions.",
          );
        }
      } else {
        lastSyncedPermissionsRef.current = snapshot;
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (permissionsSyncTimeoutRef.current) {
        clearTimeout(permissionsSyncTimeoutRef.current);
      }
    };
  }, [canPersistOwnerSettings, isOwnerRole, memberCustomPermissions, ownerNickname]);

  useEffect(() => {
    if (!cosmeticsSyncReadyRef.current || !supabase || !canPersistOwnerSettings) {
      return;
    }

    if (cosmeticsSyncTimeoutRef.current) {
      clearTimeout(cosmeticsSyncTimeoutRef.current);
    }

    cosmeticsSyncTimeoutRef.current = setTimeout(async () => {
      const snapshot = JSON.stringify(memberCosmeticGrants);
      if (snapshot === lastSyncedCosmeticsRef.current) return;

      const rows: OwnerMemberCosmeticsRow[] = Object.entries(
        memberCosmeticGrants,
      ).map(([nickname, grant]) => ({
        nickname,
        updated_by: ownerNickname,
        vip_tier: grant.vipTier || null,
        frame: grant.frame || null,
      }));

      const existingNicknames = await listOwnerMemberCosmeticNicknames();
      const keep = new Set(rows.map((row) => row.nickname));
      const toDelete = existingNicknames.filter((nickname) => !keep.has(nickname));

      for (const nickname of toDelete) {
        const { error: delErr } = await deleteOwnerMemberCosmetic(nickname);
        if (delErr) {
          console.warn("Failed to delete cosmetic row:", nickname, delErr.message);
        }
      }

      if (rows.length === 0) return;

      const { error } = await upsertOwnerMemberCosmetics(rows);

      if (error) {
        console.warn("Failed to sync owner member cosmetics", error);
      } else {
        lastSyncedCosmeticsRef.current = snapshot;
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (cosmeticsSyncTimeoutRef.current) {
        clearTimeout(cosmeticsSyncTimeoutRef.current);
      }
    };
  }, [canPersistOwnerSettings, memberCosmeticGrants, ownerNickname]);

  return {
    memberCustomPermissions,
    setMemberCustomPermissions,
    memberCosmeticGrants,
    setMemberCosmeticGrants,
    applyPermissionsFromRows,
    applyCosmeticsFromRows,
    resetMemberAccessSyncReady: resetSyncReady,
    markMemberAccessSyncReady: markSyncReady,
  };
}
