// Chat helpers extracted from ChatScreen.tsx — pure refactor, no behavior change.

import type { MemberCosmeticGrant, MemberCustomPermissions, UserSession } from "./chatTypes";

/** Allow only http(s) URLs — blocks javascript:, data:, vbscript: in chat links/media. */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const PRIVATE_STORAGE_REF =
  /^chat-media-private\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+/i;

/** Private bucket object ref stored in DB (re-signed on playback). */
export function isPrivateStorageRef(ref: string): boolean {
  return PRIVATE_STORAGE_REF.test(ref.trim());
}

export function isSafeMediaReference(ref: string): boolean {
  const trimmed = ref.trim();
  return isSafeHttpUrl(trimmed) || isPrivateStorageRef(trimmed);
}

/** Returns a safe http(s) URL, private storage ref, or null. */
export function filterSafeMediaUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim().slice(0, 2048);
  return isSafeMediaReference(trimmed) ? trimmed : null;
}

/** Strict hex color for inline [color=#...] tags. */
export function sanitizeHexColor(value: string): string | null {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : null;
}

export function getYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match?.[2];
  const YT_ID = /^[a-zA-Z0-9_-]{11}$/;
  return videoId && YT_ID.test(videoId) ? videoId : null;
}

export function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace("#", "").trim();
  const value = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (value.length !== 6) return `rgba(16,185,129,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export type StoreCosmeticsSnapshot = {
  isActive?: boolean;
  type?: string;
  expiresAt?: number;
} | null;

export const OWNER_FIRE_FRAME = "from-red-500 via-orange-500 to-yellow-500";

/**
 * getRoleFromAuthor — النسخة الآمنة (صلاحيات + هوية إدارية)
 */
export const getRoleFromAuthor = (
  author: string,
  currentUserObj: any,
  chatMembers?: Array<{ nickname: string; role: string }>,
): "owner" | "admin" | "platinum_vip" | "vip" | "none" => {
  if (author === currentUserObj.nickname) {
    const roleLower = (currentUserObj.role || "").toLowerCase();
    if (roleLower === "owner") return "owner";
    if (roleLower === "admin") return "admin";
    if (roleLower === "platinum_vip") return "platinum_vip";
    if (roleLower === "vip") return "vip";
    return "none";
  }

  if (chatMembers && chatMembers.length > 0) {
    const member = chatMembers.find((m) => m.nickname === author);
    if (member) {
      const roleLower = (member.role || "").toLowerCase();
      if (roleLower === "owner") return "owner";
      if (roleLower === "admin") return "admin";
      if (roleLower === "platinum_vip") return "platinum_vip";
      if (roleLower === "vip") return "vip";
    }
  }

  return "none";
};

export function isOwnerAuthor(
  author: string,
  currentUserObj: { nickname: string; role?: string },
  chatMembers?: Array<{ nickname: string; role: string }>,
): boolean {
  return getRoleFromAuthor(author, currentUserObj, chatMembers) === "owner";
}

function isStoreActive(store?: StoreCosmeticsSnapshot): boolean {
  return !!(
    store?.isActive &&
    store.expiresAt &&
    store.expiresAt > Date.now()
  );
}

function getOwnerGrant(
  author: string,
  grants?: Record<string, MemberCosmeticGrant>,
): MemberCosmeticGrant | undefined {
  return grants?.[author];
}

/** VIP tier: متجر (للعضو الحالي) أو منح المالك */
export function resolveVipTier(
  author: string,
  currentUserObj: { nickname: string },
  store?: StoreCosmeticsSnapshot,
  grants?: Record<string, MemberCosmeticGrant>,
): "platinum" | "vip" | null {
  const grantTier = getOwnerGrant(author, grants)?.vipTier;
  if (grantTier === "platinum") return "platinum";
  if (grantTier === "vip") return "vip";

  if (author === currentUserObj.nickname && isStoreActive(store)) {
    return store?.type === "platinum" ? "platinum" : "vip";
  }

  return null;
}

export function hasStoreVipDisplay(
  author: string,
  currentUserObj: { nickname: string },
  store?: StoreCosmeticsSnapshot,
  grants?: Record<string, MemberCosmeticGrant>,
): boolean {
  return resolveVipTier(author, currentUserObj, store, grants) !== null;
}

export function hasStorePlatinumDisplay(
  author: string,
  currentUserObj: { nickname: string },
  store?: StoreCosmeticsSnapshot,
  grants?: Record<string, MemberCosmeticGrant>,
): boolean {
  return resolveVipTier(author, currentUserObj, store, grants) === "platinum";
}

export function hasOwnerGrantedCosmetics(
  author: string,
  grants?: Record<string, MemberCosmeticGrant>,
): boolean {
  const g = getOwnerGrant(author, grants);
  return !!(g?.vipTier || g?.frame);
}

/** تاج AMLogo: المالك تلقائي، الأدمن من الرتبة، VIP من المتجر أو منح المالك */
export function getCrownRoleForDisplay(
  author: string,
  currentUserObj: any,
  chatMembers?: Array<{ nickname: string; role: string }>,
  store?: StoreCosmeticsSnapshot,
  grants?: Record<string, MemberCosmeticGrant>,
): "owner" | "admin" | "vip" | "none" {
  const role = getRoleFromAuthor(author, currentUserObj, chatMembers);
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (hasStoreVipDisplay(author, currentUserObj, store, grants)) return "vip";
  return "none";
}

/** اسم متوهج: المالك تلقائي، Platinum من المتجر أو منح المالك */
export function getPrestigeNameClass(
  author: string,
  currentUserObj: any,
  chatMembers?: Array<{ nickname: string; role: string }>,
  store?: StoreCosmeticsSnapshot,
  grants?: Record<string, MemberCosmeticGrant>,
): string {
  if (isOwnerAuthor(author, currentUserObj, chatMembers)) {
    return "lamma-owner-name";
  }
  if (hasStorePlatinumDisplay(author, currentUserObj, store, grants)) {
    return "lamma-platinum-name";
  }
  return "";
}

export function getStoreVipChip(
  author: string,
  currentUserObj: { nickname: string },
  store?: StoreCosmeticsSnapshot,
  grants?: Record<string, MemberCosmeticGrant>,
): "platinum" | "vip" | null {
  const tier = resolveVipTier(author, currentUserObj, store, grants);
  if (tier === "platinum") return "platinum";
  if (tier === "vip") return "vip";
  return null;
}

/** إطار الصورة: المالك لهب تلقائي، الباقي منح المالك أو المتجر */
export const getFrameFromAuthor = (
  author: string,
  currentUserObj: any,
  chatMembers?: Array<{ nickname: string; role: string }>,
  grants?: Record<string, MemberCosmeticGrant>,
): string => {
  if (author === currentUserObj.nickname) {
    const roleLower = (currentUserObj.role || "").toLowerCase();
    if (roleLower === "owner") {
      return currentUserObj.frame || OWNER_FIRE_FRAME;
    }
    const grantFrame = getOwnerGrant(author, grants)?.frame;
    if (grantFrame) return grantFrame;
    return currentUserObj.frame || "";
  }
  if (isOwnerAuthor(author, currentUserObj, chatMembers)) {
    return OWNER_FIRE_FRAME;
  }
  const grantFrame = getOwnerGrant(author, grants)?.frame;
  if (grantFrame) return grantFrame;
  return "";
};

export function getShortenedNickname(nickname: string): string {
  return nickname
    .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
    .trim();
}

export const EMPTY_MEMBER_PERMISSIONS: MemberCustomPermissions = {
  recordingAllowed: false,
  callsAllowed: false,
  videoCallsAllowed: false,
  musicRadioAllowed: false,
  roomCreationAllowed: false,
  roomCreationQuota: 0,
  imagesAllowed: false,
  youtubeAllowed: false,
};

export function getMemberPermissions(
  perms: Record<string, MemberCustomPermissions>,
  nickname: string,
): MemberCustomPermissions {
  return perms[nickname] || EMPTY_MEMBER_PERMISSIONS;
}

export function isOwnerOrAdminRole(role: string): boolean {
  return role === "owner" || role === "admin";
}

export function isStoreVipRole(role: string): boolean {
  return role === "vip" || role === "platinum_vip" || role === "mod";
}

export function canUseMusicRadio(
  user: Pick<UserSession, "nickname" | "role">,
  perms: Record<string, MemberCustomPermissions>,
): boolean {
  if (isOwnerOrAdminRole(user.role)) return true;
  return !!getMemberPermissions(perms, user.nickname).musicRadioAllowed;
}

/** تشغيل/رفع موسيقى أو راديو شخصي — يحتاج منحة من المالك */
export function canControlMusicRadio(
  user: Pick<UserSession, "nickname" | "role">,
  perms: Record<string, MemberCustomPermissions>,
): boolean {
  return canUseMusicRadio(user, perms);
}

/** الاستماع لبث DJ المالك في الغرفة — متاح للجميع افتراضياً */
export function canListenToOwnerDj(): boolean {
  return true;
}

export function canSendImages(
  user: Pick<UserSession, "nickname" | "role">,
  perms: Record<string, MemberCustomPermissions>,
  vipOnlyMode: boolean,
): boolean {
  if (isOwnerOrAdminRole(user.role)) return true;
  const member = getMemberPermissions(perms, user.nickname);
  if (member.imagesAllowed) return true;
  if (vipOnlyMode && isStoreVipRole(user.role)) return true;
  return false;
}

export function canShareYoutube(
  user: Pick<UserSession, "nickname" | "role">,
  perms: Record<string, MemberCustomPermissions>,
): boolean {
  if (isOwnerOrAdminRole(user.role)) return true;
  return !!getMemberPermissions(perms, user.nickname).youtubeAllowed;
}

export function textContainsYoutubeUrl(text: string): boolean {
  return /youtu\.be\/|youtube\.com\/|youtube\.com\/watch/i.test(text);
}

export function getRoomCreationQuotaRemaining(
  user: Pick<UserSession, "nickname" | "role">,
  perms: Record<string, MemberCustomPermissions>,
  myRoomCount: number,
): { allowed: boolean; quota: number; used: number; remaining: number } {
  if (isOwnerOrAdminRole(user.role)) {
    return { allowed: true, quota: 9999, used: myRoomCount, remaining: 9999 };
  }
  const member = getMemberPermissions(perms, user.nickname);
  const quota = Math.max(0, member.roomCreationQuota || 0);
  const allowed = member.roomCreationAllowed && quota > 0;
  return {
    allowed,
    quota,
    used: myRoomCount,
    remaining: Math.max(0, quota - myRoomCount),
  };
}
