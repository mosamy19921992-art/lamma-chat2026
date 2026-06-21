import { supabase } from "../../lib/supabase";
import type { OwnerSettingsRow } from "../../lib/supabase";

/** Safe subset synced to public_chat_settings for guests and members. */
export type PublicChatSettingsPayload = Pick<
  OwnerSettingsRow,
  | "maintenance_mode"
  | "global_mute"
  | "global_mic_mute"
  | "vip_only_images"
  | "bot_silent"
  | "ads_enabled"
  | "greetings_enabled"
  | "invite_only_mode"
  | "owner_bg_image"
  | "custom_logo_url"
  | "room_bg_map"
  | "design_presets"
  | "room_dj_map"
  | "glow_color"
  | "wall_theme"
  | "chat_theme"
  | "universal_style_config"
>;

export async function fetchPublicChatSettings(): Promise<PublicChatSettingsPayload | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("public_chat_settings")
    .select("payload")
    .eq("id", "global")
    .maybeSingle();
  if (error) {
    console.warn("fetchPublicChatSettings failed", error);
    return null;
  }
  return (data?.payload as PublicChatSettingsPayload | null) ?? null;
}

export async function pingChatBackend(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("ping_chat_backend");
  if (error) {
    console.warn("pingChatBackend failed", error);
    return false;
  }
  return Boolean(data);
}
