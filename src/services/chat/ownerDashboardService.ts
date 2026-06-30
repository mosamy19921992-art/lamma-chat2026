import {
  supabase,
  type OwnerActivityLogRow,
  type OwnerMemberCosmeticsRow,
  type OwnerMemberPermissionRow,
  type OwnerSettingsRow,
} from "../../lib/supabase";
import type { PublicChatSettingsPayload } from "./ownerSettingsService";

export const OWNER_SETTINGS_ROW_ID = "global";

export type OwnerDashboardBundle = {
  ownerSettings: OwnerSettingsRow | null;
  publicSettings: PublicChatSettingsPayload | null;
  permissions: OwnerMemberPermissionRow[];
  cosmetics: OwnerMemberCosmeticsRow[];
  activityLogs: OwnerActivityLogRow[];
};

export async function fetchOwnerDashboardBundle(options: {
  isManagementRole: boolean;
  includeActivityLogs: boolean;
}): Promise<OwnerDashboardBundle | null> {
  if (!supabase) return null;

  const settingsRequest = options.isManagementRole
    ? supabase
        .from("owner_settings")
        .select("*")
        .eq("id", OWNER_SETTINGS_ROW_ID)
        .maybeSingle<OwnerSettingsRow>()
    : supabase
        .from("public_chat_settings")
        .select("payload")
        .eq("id", OWNER_SETTINGS_ROW_ID)
        .maybeSingle<{ payload: PublicChatSettingsPayload }>();

  const permissionsRequest = supabase.from("owner_member_permissions").select("*");
  const cosmeticsRequest = supabase.from("owner_member_cosmetics").select("*");
  const logsRequest = options.includeActivityLogs
    ? supabase
        .from("owner_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
    : Promise.resolve({ data: null, error: null });

  const [settingsResult, permissionsResult, cosmeticsResult, logsResult] =
    await Promise.all([
      settingsRequest,
      permissionsRequest,
      cosmeticsRequest,
      logsRequest,
    ]);

  if (settingsResult.error) {
    console.warn("fetchOwnerDashboardBundle settings:", settingsResult.error);
  }
  if (permissionsResult.error) {
    console.warn("fetchOwnerDashboardBundle permissions:", permissionsResult.error);
  }
  if (cosmeticsResult.error) {
    console.warn("fetchOwnerDashboardBundle cosmetics:", cosmeticsResult.error);
  }
  if (logsResult.error) {
    console.warn("fetchOwnerDashboardBundle logs:", logsResult.error);
  }

  return {
    ownerSettings: options.isManagementRole
      ? ((settingsResult.data as OwnerSettingsRow | null) ?? null)
      : null,
    publicSettings: options.isManagementRole
      ? null
      : (((settingsResult.data as { payload?: PublicChatSettingsPayload } | null)
          ?.payload as PublicChatSettingsPayload | null) ?? null),
    permissions: Array.isArray(permissionsResult.data)
      ? (permissionsResult.data as OwnerMemberPermissionRow[])
      : [],
    cosmetics: Array.isArray(cosmeticsResult.data)
      ? (cosmeticsResult.data as OwnerMemberCosmeticsRow[])
      : [],
    activityLogs: Array.isArray(logsResult.data)
      ? (logsResult.data as OwnerActivityLogRow[])
      : [],
  };
}

export async function upsertOwnerSettingsRow(
  payload: OwnerSettingsRow,
): Promise<{ error: { message: string; code?: string } | null }> {
  if (!supabase) {
    return { error: { message: "Supabase client is not configured." } };
  }

  const { error } = await supabase
    .from("owner_settings")
    .upsert(payload, { onConflict: "id" });

  return {
    error: error ? { message: error.message, code: error.code } : null,
  };
}

export async function upsertOwnerMemberPermissions(
  rows: OwnerMemberPermissionRow[],
): Promise<{ error: { message: string } | null }> {
  if (!supabase) {
    return { error: { message: "Supabase client is not configured." } };
  }
  if (rows.length === 0) {
    return { error: null };
  }

  const { error } = await supabase
    .from("owner_member_permissions")
    .upsert(rows, { onConflict: "nickname" });

  return { error: error ? { message: error.message } : null };
}

export async function listOwnerMemberCosmeticNicknames(): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("owner_member_cosmetics")
    .select("nickname");

  if (error) {
    console.warn("listOwnerMemberCosmeticNicknames:", error.message);
    return [];
  }

  return (data || [])
    .map((row) => row.nickname)
    .filter((nickname): nickname is string => Boolean(nickname));
}

export async function deleteOwnerMemberCosmetic(
  nickname: string,
): Promise<{ error: { message: string } | null }> {
  if (!supabase) {
    return { error: { message: "Supabase client is not configured." } };
  }

  const { error } = await supabase
    .from("owner_member_cosmetics")
    .delete()
    .eq("nickname", nickname);

  return { error: error ? { message: error.message } : null };
}

export async function upsertOwnerMemberCosmetics(
  rows: OwnerMemberCosmeticsRow[],
): Promise<{ error: { message: string } | null }> {
  if (!supabase) {
    return { error: { message: "Supabase client is not configured." } };
  }
  if (rows.length === 0) {
    return { error: null };
  }

  const { error } = await supabase
    .from("owner_member_cosmetics")
    .upsert(rows, { onConflict: "nickname" });

  return { error: error ? { message: error.message } : null };
}
