import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
  /\/rest\/v1\/?$/,
  "",
);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const browserStorage =
  typeof window !== "undefined" ? window.localStorage : undefined;

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "lamma-chat-auth",
        storage: browserStorage,
      },
    })
  : null;

/** Use in services when Supabase is required — throws if env is missing. */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

export function getClientUid() {
  const key = "lamma_client_uid";
  const storage = safeLocalStorage();
  let uid = storage?.getItem(key) ?? null;
  if (!uid) {
    uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage?.setItem(key, uid);
  }
  return uid;
}

export interface SupabaseMessage {
  id?: string;
  created_at?: string;
  room_id: string;
  author: string;
  text: string;
  color: string;
  sender_uid?: string;
  type: string;
  media_url?: string;
  gift_icon?: string;
  gift_name?: string;
  youtube_id?: string;
  reactions?: Record<string, number>;
}

export interface OwnerSettingsRow {
  id: string;
  created_at?: string;
  updated_at?: string;
  ghost_mode?: boolean;
  spy_mode?: boolean;
  maintenance_mode?: boolean;
  global_mute?: boolean;
  global_mic_mute?: boolean;
  bot_enabled?: boolean;
  bot_rule_anti_links?: boolean;
  bot_rule_anti_spam?: boolean;
  bot_rule_swear_filter?: boolean;
  vip_only_images?: boolean;
  bot_silent?: boolean;
  ads_enabled?: boolean;
  greetings_enabled?: boolean;
  invite_only_mode?: boolean;
  banned_words?: string[] | null;
  owner_bg_image?: string | null;
  custom_logo_url?: string | null;
  glow_color?: string | null;
  wall_theme?: string | null;
  room_bg_map?: Record<string, string> | null;
  design_presets?: unknown[] | null;
  chat_theme?: string | null;
  room_dj_map?: Record<string, unknown> | null;
  dj_library?: unknown[] | null;
  universal_style_config?: Record<string, unknown> | null;
}

export interface OwnerMemberPermissionRow {
  nickname: string;
  updated_at?: string;
  updated_by?: string | null;
  recording_allowed?: boolean;
  calls_allowed?: boolean;
  video_calls_allowed?: boolean;
  music_radio_allowed?: boolean;
  room_creation_allowed?: boolean;
  room_creation_quota?: number;
  images_allowed?: boolean;
  youtube_allowed?: boolean;
}

export interface OwnerMemberCosmeticsRow {
  nickname: string;
  updated_at?: string;
  updated_by?: string | null;
  vip_tier?: "vip" | "platinum" | null;
  frame?: string | null;
}

export interface OwnerActivityLogRow {
  id?: string;
  created_at?: string;
  time: string;
  type: "login" | "logout" | "ban" | "promote" | "demote";
  user_nickname: string;
  operator_nickname: string;
  details: string;
}

export interface BannedUserRow {
  id?: string;
  created_at?: string;
  uid: string;
  author: string;
  banner: string;
  reason: string;
  ban_type?: string;
  room_id?: string | null;
  target_user_id?: string | null;
  expires_at?: string | null;
}

export interface NicknameChangeRequestRow {
  id?: string;
  created_at?: string;
  user_id: string;
  user_email?: string | null;
  current_nickname: string;
  requested_nickname: string;
  status: "pending" | "approved" | "rejected";
  owner_note?: string | null;
  processed_at?: string | null;
  processed_by?: string | null;
}

