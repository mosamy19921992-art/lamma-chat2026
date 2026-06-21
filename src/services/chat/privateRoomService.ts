import { supabase } from "../../lib/supabase";
import type { CustomRoomEntry } from "../../lib/chatTypes";

export type PrivateRoomPublic = {
  room_id: string;
  name: string;
  owner_nickname: string;
  owner_uid: string;
  is_locked: boolean;
  created_at: string;
};

export type CreatePrivateRoomResult = {
  ok: boolean;
  roomId?: string;
  name?: string;
  isLocked?: boolean;
  quota?: number;
  used?: number;
  error?: string;
};

const UNLOCKED_KEY = "lamma_unlocked_private_rooms";

export function readUnlockedRoomIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function markRoomUnlocked(roomId: string): void {
  if (typeof window === "undefined") return;
  const set = readUnlockedRoomIds();
  set.add(roomId);
  sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set]));
}

export function isRoomUnlockedLocally(roomId: string): boolean {
  return readUnlockedRoomIds().has(roomId);
}

export async function fetchPrivateChatRooms(): Promise<PrivateRoomPublic[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_private_chat_rooms");
  if (error) {
    console.warn("list_private_chat_rooms:", error.message);
    return [];
  }
  return (data || []) as PrivateRoomPublic[];
}

export function privateRoomToEntry(row: PrivateRoomPublic): CustomRoomEntry {
  return {
    id: row.room_id,
    name: row.name,
    icon: row.is_locked ? "🔒" : "✨",
    count: 0,
    category: "private",
    createdBy: row.owner_nickname,
    isLocked: row.is_locked,
    ownerUid: row.owner_uid,
  };
}

export async function createPrivateChatRoom(input: {
  name: string;
  password: string;
  operatorNickname: string;
  roomId?: string;
}): Promise<CreatePrivateRoomResult> {
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  const { data, error } = await supabase.rpc("create_private_chat_room", {
    p_name: input.name,
    p_password: input.password,
    p_operator_nickname: input.operatorNickname,
    p_room_id: input.roomId?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.ok === false) {
    return {
      ok: false,
      error: typeof payload.error === "string" ? payload.error : "create_failed",
      quota: typeof payload.quota === "number" ? payload.quota : undefined,
      used: typeof payload.used === "number" ? payload.used : undefined,
    };
  }

  return {
    ok: true,
    roomId: typeof payload.room_id === "string" ? payload.room_id : undefined,
    name: typeof payload.name === "string" ? payload.name : input.name,
    isLocked: payload.is_locked === true,
    quota: typeof payload.quota === "number" ? payload.quota : undefined,
    used: typeof payload.used === "number" ? payload.used : undefined,
  };
}

export async function verifyPrivateRoomPassword(
  roomId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  const { data, error } = await supabase.rpc("verify_private_room_password", {
    p_room_id: roomId,
    p_password: password,
  });

  if (error) return { ok: false, error: error.message };

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.ok === true) return { ok: true };
  return {
    ok: false,
    error: typeof payload.error === "string" ? payload.error : "verify_failed",
  };
}

export async function countMyPrivateRooms(userId: string): Promise<number> {
  if (!supabase || !userId) return 0;
  const rooms = await fetchPrivateChatRooms();
  return rooms.filter((r) => r.owner_uid === userId).length;
}
