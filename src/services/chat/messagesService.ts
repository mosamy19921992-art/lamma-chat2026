import { supabase, type SupabaseMessage } from "../../lib/supabase";
import type { Message } from "../../lib/chatTypes";

export async function fetchRoomMessages(
  roomId: string,
  publicChatSessionStartedAt: string,
) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client is not configured.") };
  }

  return supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .gte("created_at", publicChatSessionStartedAt)
    .order("created_at", { ascending: true })
    .limit(100);
}

function formatComposerTime(): string {
  return new Date().toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

interface CreateOutgoingRoomMessageOptions {
  author: string;
  text: string;
  color?: string;
  isShadowed?: boolean;
}

export function createOutgoingRoomMessage({
  author,
  text,
  color,
  isShadowed = false,
}: CreateOutgoingRoomMessageOptions): Message {
  return {
    id: crypto.randomUUID(),
    author,
    text,
    color,
    isOwn: true,
    time: formatComposerTime(),
    type: isShadowed ? "shadow_msg" : "text",
  };
}

export function appendRoomMessage(
  messages: Message[],
  message: Message,
): Message[] {
  return [...messages, message];
}

interface PersistRoomMessageOptions {
  message: Message;
  roomId: string;
  senderUid: string;
}

export async function persistRoomMessage({
  message,
  roomId,
  senderUid,
}: PersistRoomMessageOptions): Promise<void> {
  if (!supabase || message.type === "shadow_msg") {
    return;
  }

  const { error } = await supabase.from("messages").insert([
    {
      id: message.id,
      room_id: roomId,
      author: message.author,
      text: message.text,
      color: message.color || "#10b981",
      type: "text",
      sender_uid: senderUid,
    },
  ]);

  if (error) {
    throw error;
  }
}

export function subscribeToRoomMessages(
  roomId: string,
  onInsert: (message: SupabaseMessage) => void,
) {
  if (!supabase) return null;

  return supabase
    .channel(`room_${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onInsert(payload.new as SupabaseMessage);
      },
    )
    .subscribe();
}

export function unsubscribeFromRoomMessages(subscription: ReturnType<typeof subscribeToRoomMessages>) {
  if (!subscription || !supabase) return;
  supabase.removeChannel(subscription);
}
