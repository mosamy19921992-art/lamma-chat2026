import type { MemberRole } from "../../lib/chatTypes";
import {
  DEFAULT_ENABLED_ROLES,
  DEFAULT_GRANT_MATRIX,
  mergeRolePolicy,
  type RoleGrantsPolicy,
} from "../../lib/rolePolicy";
import { supabase } from "../../lib/supabase";

const POLICY_ROW_ID = "global";

type PolicyRow = {
  enabled_roles: Record<string, boolean>;
  grant_matrix: Record<string, string[]>;
};

export type TempGrantRow = {
  room_id: string;
  user_id: string;
  nickname: string;
  role: MemberRole;
  grant_type: "session" | "timed";
  expires_at: string | null;
};

export type RoomGrantRow = {
  room_id: string;
  user_id: string;
  nickname: string;
  role: MemberRole;
  updated_at: string;
};

function rowToPolicy(row: PolicyRow | null): RoleGrantsPolicy {
  if (!row) return mergeRolePolicy();
  return mergeRolePolicy({
    enabledRoles: row.enabled_roles as RoleGrantsPolicy["enabledRoles"],
    grantMatrix: row.grant_matrix as RoleGrantsPolicy["grantMatrix"],
  });
}

export async function fetchRoleGrantsPolicy(): Promise<RoleGrantsPolicy> {
  if (!supabase) return mergeRolePolicy();
  const { data, error } = await supabase
    .from("role_grants_policy")
    .select("enabled_roles, grant_matrix")
    .eq("id", POLICY_ROW_ID)
    .maybeSingle<PolicyRow>();
  if (error) {
    console.warn("fetchRoleGrantsPolicy:", error.message);
    return mergeRolePolicy();
  }
  return rowToPolicy(data);
}

export async function saveRoleGrantsPolicy(
  policy: RoleGrantsPolicy,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "supabase_not_configured" };
  const { error } = await supabase.from("role_grants_policy").upsert({
    id: POLICY_ROW_ID,
    enabled_roles: policy.enabledRoles,
    grant_matrix: policy.grantMatrix,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchRoomTempGrants(
  roomId: string,
): Promise<Record<string, MemberRole>> {
  if (!supabase || !roomId) return {};
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("room_temp_grants")
    .select("user_id, role, expires_at, grant_type")
    .eq("room_id", roomId);
  if (error) {
    console.warn("fetchRoomTempGrants:", error.message);
    return {};
  }
  const map: Record<string, MemberRole> = {};
  for (const row of data || []) {
    if (row.expires_at && row.expires_at < now) continue;
    if (typeof row.user_id === "string" && typeof row.role === "string") {
      map[row.user_id] = row.role as MemberRole;
    }
  }
  return map;
}

export async function fetchAllRoomMemberGrants(): Promise<RoomGrantRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_member_roles")
    .select("room_id, user_id, nickname, role, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("fetchAllRoomMemberGrants:", error.message);
    return [];
  }
  return (data || []) as RoomGrantRow[];
}

export async function fetchAllTempGrants(): Promise<TempGrantRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_temp_grants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("fetchAllTempGrants:", error.message);
    return [];
  }
  return (data || []) as TempGrantRow[];
}

export async function revokeMyTempGrants(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("revoke_my_temp_grants");
  if (error) {
    console.warn("revokeMyTempGrants failed:", error.message);
  }
}

export function buildDefaultPolicyPayload(): RoleGrantsPolicy {
  return {
    enabledRoles: { ...DEFAULT_ENABLED_ROLES },
    grantMatrix: { ...DEFAULT_GRANT_MATRIX },
  };
}
