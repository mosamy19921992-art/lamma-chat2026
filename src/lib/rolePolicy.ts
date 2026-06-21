import type { MemberRole } from "./chatTypes";

/** Rank order — higher = more authority (Kalamngy-inspired ladder). */
export const ROLE_RANK: Record<MemberRole, number> = {
  owner: 100,
  admin: 80,
  mod: 60,
  host: 40,
  platinum_vip: 30,
  vip: 20,
  user: 10,
  guest: 0,
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "👑 مالك",
  admin: "🛡️ أدمن",
  mod: "🔰 مشرف",
  host: "🎤 هوست",
  platinum_vip: "💎 VIP بلاتيني",
  vip: "💎 VIP",
  user: "👤 عضو",
  guest: "👤 زائر",
};

export const ROLE_CHIP_CLASS: Record<MemberRole, string> = {
  owner: "lamma-role-owner lamma-boss-badge",
  admin: "lamma-role-admin",
  mod: "lamma-role-mod",
  host: "lamma-role-host",
  platinum_vip: "lamma-role-plat",
  vip: "lamma-role-vip",
  user: "lamma-role-chip",
  guest: "lamma-role-chip",
};

/** Default Kalamngy-style: each rank grants strictly lower ranks. */
export const DEFAULT_GRANT_MATRIX: Record<MemberRole, MemberRole[]> = {
  owner: ["admin", "mod", "host", "platinum_vip", "vip", "user", "guest"],
  admin: ["mod", "host", "platinum_vip", "vip", "user", "guest"],
  mod: ["host", "platinum_vip", "vip"],
  host: ["vip"],
  platinum_vip: [],
  vip: [],
  user: [],
  guest: [],
};

export const DEFAULT_ENABLED_ROLES: Record<MemberRole, boolean> = {
  owner: true,
  admin: true,
  mod: true,
  host: true,
  platinum_vip: true,
  vip: true,
  user: true,
  guest: true,
};

export type RoleGrantsPolicy = {
  enabledRoles: Record<MemberRole, boolean>;
  grantMatrix: Record<MemberRole, MemberRole[]>;
};

export function normalizeMemberRole(raw?: string | null): MemberRole {
  const role = (raw || "").toLowerCase();
  if (role in ROLE_RANK) return role as MemberRole;
  return "user";
}

export function getRoleRank(role: string | undefined | null): number {
  return ROLE_RANK[normalizeMemberRole(role)] ?? 0;
}

export function isStaffRole(role: string | undefined): boolean {
  const rank = getRoleRank(role);
  return rank >= ROLE_RANK.host;
}

export function isGlobalStaffRole(role: string | undefined): boolean {
  const r = normalizeMemberRole(role);
  return r === "owner" || r === "admin";
}

export function isRoomScopedRole(role: string): boolean {
  const r = normalizeMemberRole(role);
  return r === "mod" || r === "host" || r === "vip" || r === "platinum_vip";
}

export function isGlobalPromotionRole(role: string): boolean {
  const r = normalizeMemberRole(role);
  return r === "owner" || r === "admin";
}

export function mergeRolePolicy(
  partial?: Partial<RoleGrantsPolicy> | null,
): RoleGrantsPolicy {
  return {
    enabledRoles: {
      ...DEFAULT_ENABLED_ROLES,
      ...(partial?.enabledRoles as Record<MemberRole, boolean> | undefined),
    },
    grantMatrix: {
      ...DEFAULT_GRANT_MATRIX,
      ...(partial?.grantMatrix as Record<MemberRole, MemberRole[]> | undefined),
    },
  };
}

export function canGrantRole(
  granterRole: string,
  targetRole: string,
  policy: RoleGrantsPolicy = mergeRolePolicy(),
): boolean {
  const granter = normalizeMemberRole(granterRole);
  const target = normalizeMemberRole(targetRole);
  if (!policy.enabledRoles[target]) return false;
  if (target === "owner" && granter !== "owner") return false;
  if (target === "admin" && granter !== "owner") return false;
  const allowed = policy.grantMatrix[granter] || [];
  if (allowed.includes(target)) return true;
  if (
    (target === "user" || target === "guest") &&
    getRoleRank(granter) >= ROLE_RANK.host
  ) {
    return true;
  }
  return getRoleRank(granter) > getRoleRank(target);
}

export function getGrantableRoles(
  granterRole: string,
  policy: RoleGrantsPolicy = mergeRolePolicy(),
  options?: { includeGlobal?: boolean },
): MemberRole[] {
  const granter = normalizeMemberRole(granterRole);
  const fromMatrix = policy.grantMatrix[granter] || [];
  const roles = fromMatrix.filter((r) => policy.enabledRoles[r]);
  if (options?.includeGlobal !== false && granter === "owner") {
    if (!roles.includes("admin")) roles.unshift("admin");
    if (!roles.includes("owner")) roles.unshift("owner");
  }
  return [...new Set(roles)];
}

export function canUseStaffTools(role: string | undefined): boolean {
  const rank = getRoleRank(role);
  return rank >= ROLE_RANK.host;
}

export function canPromoteMembers(role: string | undefined): boolean {
  const rank = getRoleRank(role);
  return rank >= ROLE_RANK.host;
}

export function canUseOwnerExclusiveTools(role: string | undefined): boolean {
  return normalizeMemberRole(role) === "owner";
}

export function canUseMegabanTools(role: string | undefined): boolean {
  return getRoleRank(role) >= ROLE_RANK.admin;
}

export function canUseShadowBanTools(role: string | undefined): boolean {
  return getRoleRank(role) >= ROLE_RANK.host;
}

export function canUseAdminPanel(role: string | undefined): boolean {
  return getRoleRank(role) >= ROLE_RANK.admin;
}
