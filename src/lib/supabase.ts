import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
  /\/rest\/v1\/?$/,
  "",
);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
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

