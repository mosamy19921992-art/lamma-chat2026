import { useCallback, useEffect, useRef } from "react";
import { supabase, type OwnerSettingsRow } from "../lib/supabase";
import type { PublicChatSettingsPayload } from "../services/chat/ownerSettingsService";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";
import {
  OWNER_SETTINGS_ROW_ID,
  upsertOwnerSettingsRow,
  type OwnerDashboardBundle,
} from "../services/chat/ownerDashboardService";

const OWNER_SYNC_DEBOUNCE_MS = 350;

interface UseOwnerSettingsSyncOptions {
  isManagementRole: boolean;
  isOwnerRole: boolean;
  isCurrentUserOwner: boolean;
  canPersistOwnerSettings: boolean;
  onApplyPublicSettings: (settings: PublicChatSettingsPayload) => void;
  onApplyOwnerSettingsRow: (settings: OwnerSettingsRow) => void;
  buildPersistPayload: () => OwnerSettingsRow;
}

export function useOwnerSettingsSync({
  isManagementRole,
  isOwnerRole,
  isCurrentUserOwner,
  canPersistOwnerSettings,
  onApplyPublicSettings,
  onApplyOwnerSettingsRow,
  buildPersistPayload,
}: UseOwnerSettingsSyncOptions) {
  const syncReadyRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rlsAlertShownRef = useRef(false);

  const resetSettingsSyncReady = useCallback(() => {
    syncReadyRef.current = false;
  }, []);

  const markSettingsSyncReady = useCallback(() => {
    syncReadyRef.current = true;
  }, []);

  const hydrateSettingsFromBundle = useCallback(
    (bundle: OwnerDashboardBundle) => {
      if (bundle.ownerSettings) {
        onApplyOwnerSettingsRow(bundle.ownerSettings);
        onApplyPublicSettings(bundle.ownerSettings);
        return;
      }
      if (bundle.publicSettings) {
        onApplyPublicSettings(bundle.publicSettings);
      }
    },
    [onApplyOwnerSettingsRow, onApplyPublicSettings],
  );

  useEffect(() => {
    if (!supabase) return;
    let isCancelled = false;

    if (isManagementRole) {
      const unsubscribe = subscribeChannelWithRetry(() =>
        supabase
          .channel("owner_settings_sync")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "owner_settings",
              filter: "id=eq.global",
            },
            (payload) => {
              if (isCancelled) return;
              const settings = payload.new as OwnerSettingsRow;
              onApplyOwnerSettingsRow(settings);
              onApplyPublicSettings(settings);
            },
          ),
      );
      return () => {
        isCancelled = true;
        unsubscribe();
      };
    }

    const unsubscribe = subscribeChannelWithRetry(() =>
      supabase
        .channel("public_chat_settings_sync")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "public_chat_settings",
            filter: "id=eq.global",
          },
          (payload) => {
            if (isCancelled) return;
            const row = payload.new as { payload?: PublicChatSettingsPayload };
            if (row.payload) onApplyPublicSettings(row.payload);
          },
        ),
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [
    isCurrentUserOwner,
    isManagementRole,
    onApplyOwnerSettingsRow,
    onApplyPublicSettings,
  ]);

  useEffect(() => {
    if (!syncReadyRef.current || !supabase || !canPersistOwnerSettings) {
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const payload = buildPersistPayload();
      const { error } = await upsertOwnerSettingsRow(payload);

      if (error) {
        console.warn("Failed to sync owner settings", error);
        if (error.code === "42501" && !rlsAlertShownRef.current) {
          rlsAlertShownRef.current = true;
          alert(
            "⚠️ تنبيه: التعديلات لم تُحفظ على السيرفر!\n\n" +
              "السبب: حساب المالك لا يملك صلاحية الكتابة في قاعدة البيانات (Supabase RLS).\n\n" +
              "لإصلاح هذا:\n" +
              '1. تأكد أن metadata الحساب يحتوي على role: "owner"\n' +
              "2. تأكد من صلاحيات جدول owner_settings في Supabase Dashboard\n\n" +
              "التغييرات ستعمل على جهازك فقط حتى يتم الإصلاح.",
          );
        }
      }
    }, OWNER_SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [buildPersistPayload, canPersistOwnerSettings]);

  return {
    resetSettingsSyncReady,
    markSettingsSyncReady,
    hydrateSettingsFromBundle,
  };
}

export { OWNER_SETTINGS_ROW_ID };
