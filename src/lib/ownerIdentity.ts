/** Official owner identification card artwork (BOSS). */
export const OWNER_ID_CARD_IMAGE = "/images/owner-boss-id-card.png";

export function isOwnerChatRole(role?: string | null): boolean {
  return (role || "").toLowerCase() === "owner";
}

export function resolveOwnerDisplayAvatar(avatar?: string | null): string {
  const value = (avatar || "").trim();
  if (!value || value === "👤") return OWNER_ID_CARD_IMAGE;
  return value;
}
