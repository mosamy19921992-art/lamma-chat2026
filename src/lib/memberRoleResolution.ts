import type { MemberRole } from "./chatTypes";
import {
  getRoleRank,
  isGlobalPromotionRole,
  isGlobalStaffRole,
  isRoomScopedRole,
  mergeRolePolicy,
  normalizeMemberRole,
  type RoleGrantsPolicy,
} from "./rolePolicy";

export {
  isGlobalPromotionRole,
  isGlobalStaffRole,
  isRoomScopedRole as isRoomScopedPromotionRole,
  mergeRolePolicy,
  type RoleGrantsPolicy,
};

export function rolePromotionScopeLabel(
  role: string,
  roomId: string,
  temporary?: boolean,
): string {
  if (temporary) {
    return `تاج مؤقت في غرفة «${roomId}» — ينتهي عند الخروج`;
  }
  if (isGlobalPromotionRole(role)) return "على كل الغرف";
  if (isRoomScopedRole(role)) {
    return `في غرفة «${roomId}» فقط (دائم)`;
  }
  if (role === "user" || role === "guest") {
    return `إزالة الترقية من غرفة «${roomId}»`;
  }
  return roomId;
}

/** Effective role: global owner/admin win; else highest of permanent room + temp grant. */
export function resolveEffectiveMemberRole(
  globalRole: string | undefined,
  roomRole: string | undefined | null,
  tempRole: string | undefined | null = null,
  fallback: MemberRole = "user",
): MemberRole {
  const global = normalizeMemberRole(globalRole);
  if (global === "owner" || global === "admin") {
    return global;
  }

  let best: MemberRole = global;
  if (roomRole) {
    const room = normalizeMemberRole(roomRole);
    if (getRoleRank(room) > getRoleRank(best)) best = room;
  }
  if (tempRole) {
    const temp = normalizeMemberRole(tempRole);
    if (getRoleRank(temp) > getRoleRank(best)) best = temp;
  }

  if (getRoleRank(best) >= getRoleRank("host")) return best;
  if (global === "guest") return "guest";
  if (global === "user") return "user";
  return fallback;
}

export function resolveGranterEffectiveRole(
  globalRole: string | undefined,
  roomRole: string | undefined | null,
  tempRole: string | undefined | null = null,
): MemberRole {
  return resolveEffectiveMemberRole(globalRole, roomRole, tempRole, "user");
}

export function getDefaultRolePolicy(): RoleGrantsPolicy {
  return mergeRolePolicy();
}
