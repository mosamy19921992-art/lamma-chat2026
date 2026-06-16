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
  if (message.type === "shadow_msg") {
    return;
  }

  if (!supabase) {
    throw new Error("تعذر إرسال الرسالة لأن اتصال Supabase غير متاح.");
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

interface RoomMessageSubscriptionHandlers {
  onInsert: (message: SupabaseMessage) => void;
  onDelete?: (messageId: string) => void;
}

export function subscribeToRoomMessages(
  roomId: string,
  handlers: RoomMessageSubscriptionHandlers,
) {
  if (!supabase) return null;

  let activeChannel: ReturnType<typeof supabase.channel> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const attach = () => {
    if (stopped || !supabase) return;

    activeChannel = supabase
      .channel(`room_${roomId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          handlers.onInsert(payload.new as SupabaseMessage);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          if (deletedId) {
            handlers.onDelete?.(deletedId);
          }
        },
      )
      .subscribe((status, err) => {
        if (stopped) return;

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `[Chat] Realtime channel issue for room "${roomId}":`,
            status,
            err,
          );
          if (activeChannel) {
            void supabase.removeChannel(activeChannel);
            activeChannel = null;
          }
          retryTimer = setTimeout(attach, 2500);
        }
      });
  };

  attach();

  return {
    unsubscribe: () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    },
  };
}

export function unsubscribeFromRoomMessages(
  subscription: ReturnType<typeof subscribeToRoomMessages>,
) {
  if (!subscription) return;
  subscription.unsubscribe();
}
