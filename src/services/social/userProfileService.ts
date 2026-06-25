import * as mongoSanitize from "express-mongo-sanitize";
import { supabase } from "../../lib/supabase";
import { requireAuthenticatedUid } from "../auth/guestAuthService";
import type { UserProfileRecord } from "../../lib/socialTypes";
import type { UserSession } from "../../lib/chatTypes";

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapProfileRow(row: {
  user_uid: string;
  nickname: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
}): UserProfileRecord {
  return {
    userUid: row.user_uid,
    nickname: row.nickname,
    bio: row.bio || "",
    avatarUrl: row.avatar_url || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export async function upsertCurrentUserProfile(
  currentUser: UserSession,
): Promise<void> {
  if (!supabase || !currentUser.uid || currentUser.authProvider !== "supabase") {
    return;
  }

  const authUid = await requireAuthenticatedUid();
  if (authUid !== currentUser.uid) {
    console.warn("Profile upsert blocked: session uid mismatch.");
    return;
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_uid: currentUser.uid,
      nickname: currentUser.nickname,
      avatar_url: currentUser.avatar || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_uid" },
  );

  if (error) {
    console.warn("Failed to upsert user profile:", error.message);
  }
}

export async function fetchUserProfileByNickname(
  nickname: string,
): Promise<UserProfileRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_uid, nickname, bio, avatar_url, updated_at")
    .ilike("nickname", nickname)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileRow(data);
}

export async function fetchUserProfileByUid(
  userUid: string,
): Promise<UserProfileRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_uid, nickname, bio, avatar_url, updated_at")
    .eq("user_uid", userUid)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileRow(data);
}

export async function updateUserBio(
  userUid: string,
  bio: string,
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase غير متصل.");
  }

  const authUid = await requireAuthenticatedUid();
  if (authUid !== userUid) {
    throw new Error("غير مصرح بتعديل هذا الملف الشخصي.");
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      bio: mongoSanitize.sanitize({ data: bio.trim().slice(0, 500) }).data,
      updated_at: new Date().toISOString(),
    })
    .eq("user_uid", userUid);

  if (error) throw error;
}

export async function resolveReceiverUid(
  targetNickname: string,
  onlineMembers: { id: string; nickname: string }[],
): Promise<string | null> {
  const online = onlineMembers.find(
    (member) => member.nickname.toLowerCase() === targetNickname.toLowerCase(),
  );
  if (online?.id && UUID_LIKE_PATTERN.test(online.id)) {
    return online.id;
  }

  const profile = await fetchUserProfileByNickname(targetNickname);
  return profile?.userUid ?? null;
}
