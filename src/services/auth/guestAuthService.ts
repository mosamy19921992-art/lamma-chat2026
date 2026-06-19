import { supabase } from "../../lib/supabase";
import type { UserSession } from "../../lib/chatTypes";

type SupabaseAuthUser = {
  id: string;
  is_anonymous?: boolean;
};

export function isAnonymousAuthUser(user: SupabaseAuthUser): boolean {
  return user.is_anonymous === true;
}

export async function getAuthenticatedUid(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function requireAuthenticatedUid(): Promise<string> {
  const uid = await getAuthenticatedUid();
  if (!uid) {
    throw new Error("جلسة الدخول غير صالحة. أعد الدخول وحاول مرة أخرى.");
  }
  return uid;
}

/** Anonymous Supabase auth — real auth.uid(), optional registration later. */
export async function establishGuestAuth(
  nickname: string,
  color: string,
): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase غير متصل. تعذر دخول الزائر.");
  }

  const trimmedNickname = nickname.trim().slice(0, 48) || "Guest";
  const safeColor = color?.trim() || "#10b981";

  const {
    data: { session: existing },
  } = await supabase.auth.getSession();

  if (existing?.user?.is_anonymous) {
    const uid = existing.user.id;
    const { error } = await supabase.from("guest_sessions").upsert(
      {
        auth_uid: uid,
        nickname: trimmedNickname,
        color: safeColor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_uid" },
    );
    if (error) throw error;
    return uid;
  }

  if (existing?.user && !existing.user.is_anonymous) {
    await supabase.auth.signOut({ scope: "local" });
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw error || new Error("تعذر إنشاء جلسة الزائر.");
  }

  const uid = data.user.id;
  const { error: upsertError } = await supabase.from("guest_sessions").upsert(
    {
      auth_uid: uid,
      nickname: trimmedNickname,
      color: safeColor,
    },
    { onConflict: "auth_uid" },
  );
  if (upsertError) throw upsertError;

  return uid;
}

export async function loadGuestSessionFromDb(
  authUid: string,
): Promise<Pick<UserSession, "nickname" | "color"> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guest_sessions")
    .select("nickname, color")
    .eq("auth_uid", authUid)
    .maybeSingle();

  if (error || !data?.nickname) return null;
  return { nickname: data.nickname, color: data.color || "#10b981" };
}

export async function reconcileGuestSession(
  guest: UserSession,
): Promise<UserSession> {
  if (!supabase) return guest;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.is_anonymous && session.user.id === guest.uid) {
    return guest;
  }

  const uid = await establishGuestAuth(
    guest.nickname,
    guest.color || "#10b981",
  );
  return { ...guest, uid };
}

export function buildGuestUserSession(
  authUid: string,
  nickname: string,
  color: string,
): UserSession {
  return {
    nickname,
    role: "guest",
    color: color || "#10b981",
    uid: authUid,
    email: null,
    authProvider: "guest",
  };
}
