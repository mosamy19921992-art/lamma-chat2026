import { supabase } from "../../lib/supabase";
import type { BanInfo } from "../../lib/chatTypes";
import type { BannedUserRow } from "../../lib/supabase";

export type ModerationAction =
  | "mute"
  | "unmute"
  | "room_ban"
  | "unroom_ban"
  | "megaban"
  | "unmegaban"
  | "kick"
  | "unkick"
  | "shadow"
  | "unshadow";

export type ApplyModerationInput = {
  action: ModerationAction;
  targetUserId?: string | null;
  targetNickname: string;
  roomId?: string | null;
  reason?: string;
};

export type ApplyModerationResult = {
  ok: boolean;
  error?: string;
  banId?: string;
  banType?: string;
};

const BANNED_USER_REASON_PREFIX = "lamma-ban-json:";

function parseBanType(value: unknown): BanInfo["type"] {
  const allowed: BanInfo["type"][] = [
    "mute",
    "kick",
    "ban",
    "megaban",
    "shadow",
    "room",
  ];
  return allowed.includes(value as BanInfo["type"])
    ? (value as BanInfo["type"])
    : "ban";
}

export function mapBannedUserRowToBanInfo(row: BannedUserRow): BanInfo {
  const fallbackTime = row.created_at
    ? new Date(row.created_at).toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
    : new Date().toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

  if (row.ban_type) {
    return {
      id: row.id || `ban-${Date.now()}`,
      nickname: row.author,
      fingerprint: row.uid,
      browserSignature: "",
      ip: "",
      localStorageId: row.target_user_id || row.uid,
      type: parseBanType(row.ban_type),
      roomId: row.room_id || undefined,
      banner: row.banner,
      reason: row.reason,
      time: fallbackTime,
    };
  }

  if (row.reason?.startsWith(BANNED_USER_REASON_PREFIX)) {
    try {
      const parsed = JSON.parse(
        row.reason.slice(BANNED_USER_REASON_PREFIX.length),
      ) as Partial<BanInfo>;
      return {
        id: row.id || `ban-${Date.now()}`,
        nickname: parsed.nickname || row.author,
        email: parsed.email,
        fingerprint: parsed.fingerprint || row.uid,
        browserSignature: parsed.browserSignature || "",
        ip: parsed.ip || "",
        localStorageId: parsed.localStorageId || row.uid,
        type: parseBanType(parsed.type),
        roomId: parsed.roomId,
        banner: parsed.banner || row.banner,
        reason: parsed.reason || row.reason,
        time: parsed.time || fallbackTime,
      };
    } catch {
      // fall through
    }
  }

  return {
    id: row.id || `ban-${Date.now()}`,
    nickname: row.author,
    fingerprint: row.uid,
    browserSignature: "",
    ip: "",
    localStorageId: row.uid,
    type: "ban",
    banner: row.banner,
    reason: row.reason,
    time: fallbackTime,
  };
}

export async function applyModerationAction(
  input: ApplyModerationInput,
): Promise<ApplyModerationResult> {
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  const { data, error } = await supabase.rpc("apply_moderation_action", {
    p_action: input.action,
    p_target_user_id: input.targetUserId || null,
    p_target_nickname: input.targetNickname,
    p_room_id: input.roomId || null,
    p_reason: input.reason || "",
  });

  if (error) return { ok: false, error: error.message };

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.ok === false) {
    return {
      ok: false,
      error: typeof payload.error === "string" ? payload.error : "action_failed",
    };
  }

  return {
    ok: true,
    banId: typeof payload.ban_id === "string" ? payload.ban_id : undefined,
    banType: typeof payload.ban_type === "string" ? payload.ban_type : undefined,
  };
}

export async function fetchMyActiveSanctions(): Promise<BanInfo[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_my_active_sanctions");
  if (error) {
    console.warn("get_my_active_sanctions:", error.message);
    return [];
  }

  return ((data || []) as BannedUserRow[]).map(mapBannedUserRowToBanInfo);
}

export function banActionForType(
  type: BanInfo["type"],
  enabled: boolean,
): ModerationAction | null {
  if (type === "mute") return enabled ? "unmute" : "mute";
  if (type === "room") return enabled ? "unroom_ban" : "room_ban";
  if (type === "megaban") return enabled ? "unmegaban" : "megaban";
  if (type === "kick") return enabled ? "unkick" : "kick";
  if (type === "shadow") return enabled ? "unshadow" : "shadow";
  return null;
}

export async function postRoomSystemMessage(input: {
  roomId: string;
  text: string;
  color?: string;
  author?: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  const { data, error } = await supabase.rpc("post_room_system_message", {
    p_room_id: input.roomId,
    p_text: input.text,
    p_color: input.color || "#f59e0b",
    p_author: input.author || "LC-Fire 🔥",
  });

  if (error) return { ok: false, error: error.message };

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.ok === false) {
    return {
      ok: false,
      error: typeof payload.error === "string" ? payload.error : "post_failed",
    };
  }

  return {
    ok: true,
    messageId:
      typeof payload.message_id === "string" ? payload.message_id : undefined,
  };
}
