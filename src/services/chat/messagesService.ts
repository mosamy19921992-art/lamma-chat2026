import { supabase, type SupabaseMessage } from "../../lib/supabase";
import { isSafeHttpUrl } from "../../lib/chatHelpers";
import { requireAuthenticatedUid } from "../auth/guestAuthService";
import type { Message, MessageReplyRef } from "../../lib/chatTypes";

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
    .order("created_at", { ascending: false })
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
  replyTo?: MessageReplyRef;
}

export function buildReplyPreview(msg: Pick<Message, "text" | "type" | "mediaUrl">): string {
  if (msg.type === "image") return "📷 صورة";
  if (msg.type === "video") return "🎬 فيديو";
  if (msg.type === "audio") return "🎤 رسالة صوتية";
  if (msg.type === "gift") return "🎁 هدية";
  if (msg.type === "youtube") return "▶️ يوتيوب";
  if (msg.mediaUrl) return "[مرفق]";
  const trimmed = (msg.text || "").trim();
  return trimmed ? trimmed.slice(0, 120) : "[رسالة]";
}

export function createOutgoingRoomMessage({
  author,
  text,
  color,
  isShadowed = false,
  replyTo,
}: CreateOutgoingRoomMessageOptions): Message {
  return {
    id: crypto.randomUUID(),
    author,
    text,
    color: color ?? "#10b981",
    isOwn: true,
    time: formatComposerTime(),
    type: isShadowed ? "shadow_msg" : "text",
    replyTo,
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
}

export async function persistRoomMessage({
  message,
  roomId,
}: PersistRoomMessageOptions): Promise<void> {
  if (!supabase) {
    throw new Error("تعذر إرسال الرسالة لأن اتصال Supabase غير متاح.");
  }

  const senderUid = await requireAuthenticatedUid();

  const safeText = (message.text || "").slice(0, 8000);
  const safeMedia =
    message.mediaUrl && isSafeHttpUrl(message.mediaUrl)
      ? message.mediaUrl.slice(0, 2048)
      : null;

  const row: Record<string, unknown> = {
    id: message.id,
    room_id: roomId,
    text: safeText,
    color: message.color || "#10b981",
    type: message.type === "shadow_msg" ? "text" : message.type || "text",
    sender_uid: senderUid,
  };

  if (safeMedia) {
    row.media_url = safeMedia;
  }

  if (message.replyTo?.id) {
    row.reply_to_id = message.replyTo.id;
    row.reply_to_author = (message.replyTo.author || "").slice(0, 64);
    row.reply_to_preview = (message.replyTo.preview || "").slice(0, 200);
  }

  const { error } = await supabase.from("messages").insert([row]);

  if (error) {
    throw error;
  }
}

interface RoomMessageSubscriptionHandlers {
  onInsert: (message: SupabaseMessage) => void;
  onUpdate?: (message: SupabaseMessage) => void;
  onDelete?: (messageId: string) => void;
  onRealtimeStatus?: (connected: boolean) => void;
}

export async function persistMessageReaction(
  messageId: string,
  emoji: string,
): Promise<Record<string, number>> {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data, error } = await supabase.rpc("add_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji,
  });

  if (error) {
    throw error;
  }

  return (data as Record<string, number> | null) ?? {};
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
    const client = supabase;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    activeChannel = client
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
          if (stopped) return;
          handlers.onInsert(payload.new as SupabaseMessage);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (stopped) return;
          handlers.onUpdate?.(payload.new as SupabaseMessage);
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
          if (stopped) return;
          const deletedId = (payload.old as { id?: string }).id;
          if (deletedId) {
            handlers.onDelete?.(deletedId);
          }
        },
      )
      .subscribe((status, err) => {
        if (stopped) return;

        if (status === "SUBSCRIBED") {
          handlers.onRealtimeStatus?.(true);
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          handlers.onRealtimeStatus?.(false);
          console.warn(
            `[Chat] Realtime channel issue for room "${roomId}":`,
            status,
            err,
          );
          if (activeChannel) {
            void client.removeChannel(activeChannel);
            activeChannel = null;
          }
          retryTimer = setTimeout(() => {
            if (!stopped) attach();
          }, 2500);
        }
      });
  };

  attach();

  return {
    unsubscribe: () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (activeChannel) {
        void supabase?.removeChannel(activeChannel);
        activeChannel = null;
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
