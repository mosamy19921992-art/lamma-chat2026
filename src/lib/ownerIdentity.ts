/** Official owner identification card artwork (BOSS). */
export const OWNER_ID_CARD_IMAGE = "/images/owner-boss-id-card.png";

/** English prestige label shown on owner badges in chat UI. */
export const OWNER_DISPLAY_BADGE = "BOSS";

const OWNER_ROLE_ALIASES = new Set(["owner", "malek", "malik", "boss", "المالك"]);
const ADMIN_ROLE_ALIASES = new Set(["admin", "أدمن", "adm"]);

export function isOwnerAccountRole(role?: string | null): boolean {
  const value = (role || "").toLowerCase().trim();
  return OWNER_ROLE_ALIASES.has(value);
}

export function isAdminAccountRole(role?: string | null): boolean {
  const value = (role || "").toLowerCase().trim();
  return ADMIN_ROLE_ALIASES.has(value) || value === "admin";
}

export function isOwnerChatRole(role?: string | null): boolean {
  return isOwnerAccountRole(role);
}

export function resolveOwnerDisplayAvatar(avatar?: string | null): string {
  const value = (avatar || "").trim();
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return OWNER_ID_CARD_IMAGE;
}
