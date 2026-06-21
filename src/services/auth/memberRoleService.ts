import type { MemberRole } from "../../lib/chatTypes";
import { supabase } from "../../lib/supabase";

export type RoomMemberRoleRow = {
  room_id: string;
  user_id: string;
  nickname: string;
  role: MemberRole;
};

export type PromoteMemberRoleResult = {
  ok: boolean;
  scope?: "global" | "room" | "room_clear" | "temp";
  roomId?: string;
  role?: string;
  temporary?: boolean;
  error?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistableMemberId(userId: string | undefined): userId is string {
  return !!userId && UUID_RE.test(userId);
}

export async function fetchRoomMemberRoles(
  roomId: string,
): Promise<Record<string, MemberRole>> {
  if (!supabase || !roomId) return {};

  const { data, error } = await supabase
    .from("room_member_roles")
    .select("user_id, role")
    .eq("room_id", roomId);

  if (error) {
    console.warn("Failed to fetch room_member_roles:", error.message);
    return {};
  }

  const map: Record<string, MemberRole> = {};
  for (const row of data || []) {
    if (typeof row.user_id === "string" && typeof row.role === "string") {
      map[row.user_id] = row.role as MemberRole;
    }
  }
  return map;
}

export async function promoteMemberRole(input: {
  roomId: string;
  targetUserId: string;
  targetNickname: string;
  newRole: MemberRole | string;
  operatorNickname: string;
  temporary?: boolean;
  durationMinutes?: number | null;
}): Promise<PromoteMemberRoleResult> {
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured" };
  }
  if (!isPersistableMemberId(input.targetUserId)) {
    return { ok: false, error: "invalid_target_id" };
  }

  const { data, error } = await supabase.rpc("promote_member_role", {
    p_room_id: input.roomId,
    p_target_user_id: input.targetUserId,
    p_target_nickname: input.targetNickname,
    p_new_role: input.newRole,
    p_operator_nickname: input.operatorNickname,
    p_is_temporary: !!input.temporary,
    p_duration_minutes: input.durationMinutes ?? null,
  });

  if (error) {
    console.warn("promote_member_role RPC failed:", error.message);
    return { ok: false, error: error.message };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.ok === false) {
    return {
      ok: false,
      error: typeof payload.error === "string" ? payload.error : "promote_failed",
    };
  }

  return {
    ok: true,
    scope: payload.scope as PromoteMemberRoleResult["scope"],
    roomId:
      typeof payload.room_id === "string" ? payload.room_id : input.roomId,
    role: typeof payload.role === "string" ? payload.role : String(input.newRole),
    temporary: payload.temporary === true,
  };
}
