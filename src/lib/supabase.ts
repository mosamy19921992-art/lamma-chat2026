import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
  /\/rest\/v1\/?$/,
  "",
);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const browserStorage =
  typeof window !== "undefined" ? window.localStorage : undefined;

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

export function getClientUid() {
  const key = "lamma_client_uid";
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, uid);
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
  vip_only_images?: boolean;
  bot_silent?: boolean;
  ads_enabled?: boolean;
  greetings_enabled?: boolean;
  banned_words?: string[] | null;
  owner_bg_image?: string | null;
  custom_logo_url?: string | null;
  glow_color?: string | null;
  wall_theme?: string | null;
  room_bg_map?: Record<string, string> | null;
}

export interface OwnerMemberPermissionRow {
  nickname: string;
  updated_at?: string;
  updated_by?: string | null;
  recording_allowed?: boolean;
  calls_allowed?: boolean;
  music_radio_allowed?: boolean;
  room_creation_allowed?: boolean;
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

