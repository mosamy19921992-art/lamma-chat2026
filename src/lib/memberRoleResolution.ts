import type { MemberRole } from "./chatTypes";

const GLOBAL_STAFF_ROLES = new Set<MemberRole>(["owner", "admin"]);

export function isGlobalStaffRole(role: string | undefined): boolean {
  return GLOBAL_STAFF_ROLES.has((role || "").toLowerCase() as MemberRole);
}

export function isRoomScopedPromotionRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized === "mod" || normalized === "vip" || normalized === "platinum_vip";
}

export function isGlobalPromotionRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized === "owner" || normalized === "admin";
}

/** Effective role inside a room: global owner/admin win; else room grant; else session role. */
export function resolveEffectiveMemberRole(
  globalRole: string | undefined,
  roomRole: string | undefined | null,
  fallback: MemberRole = "user",
): MemberRole {
  const global = (globalRole || "").toLowerCase();
  if (global === "owner" || global === "admin") {
    return global as MemberRole;
  }

  const room = roomRole ? roomRole.toLowerCase() : "";
  if (room === "mod" || room === "vip" || room === "platinum_vip") {
    return room as MemberRole;
  }

  if (global === "mod" || global === "vip" || global === "platinum_vip") {
    return global as MemberRole;
  }
  if (global === "guest") return "guest";
  if (global === "user") return "user";
  return fallback;
}

export function rolePromotionScopeLabel(
  role: string,
  roomId: string,
): string {
  if (isGlobalPromotionRole(role)) {
    return "على كل الغرف";
  }
  if (isRoomScopedPromotionRole(role)) {
    return `في غرفة «${roomId}» فقط`;
  }
  if (role === "user" || role === "guest") {
    return `إزالة الترقية من غرفة «${roomId}»`;
  }
  return roomId;
}
