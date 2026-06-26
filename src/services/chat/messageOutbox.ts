import { isBrowserOnline } from "../../lib/chatHelpers";
import type { Message, MessageReplyRef } from "../../lib/chatTypes";
import { persistRoomMessage } from "./messagesService";

const OUTBOX_KEY = "lamma_message_outbox";
const MAX_OUTBOX = 40;

export interface OutboxMessageItem {
  id: string;
  roomId: string;
  author: string;
  text: string;
  color: string;
  isShadowed: boolean;
  createdAt: number;
  replyTo?: MessageReplyRef;
}

function readOutbox(): OutboxMessageItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is OutboxMessageItem =>
          !!item &&
          typeof item === "object" &&
          typeof (item as OutboxMessageItem).id === "string" &&
          typeof (item as OutboxMessageItem).roomId === "string" &&
          typeof (item as OutboxMessageItem).text === "string",
      )
      .slice(0, MAX_OUTBOX);
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxMessageItem[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(0, MAX_OUTBOX)));
  } catch {
    // quota — drop oldest
  }
}

export function enqueueOutboxMessage(item: OutboxMessageItem) {
  const next = [...readOutbox().filter((row) => row.id !== item.id), item].slice(
    -MAX_OUTBOX,
  );
  writeOutbox(next);
}

export function removeOutboxMessage(id: string) {
  writeOutbox(readOutbox().filter((row) => row.id !== id));
}

export function outboxCount(): number {
  return readOutbox().length;
}

export function getOutboxMessages(): OutboxMessageItem[] {
  return readOutbox();
}

export async function flushMessageOutbox(
  onDelivered?: (roomId: string, messageId: string) => void,
): Promise<number> {
  if (!isBrowserOnline()) return 0;

  let delivered = 0;
  for (const item of readOutbox()) {
    if (!isBrowserOnline()) break;
    const message: Message = {
      id: item.id,
      author: item.author,
      text: item.text,
      color: item.color,
      isOwn: true,
      time: new Date(item.createdAt).toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }),
      type: item.isShadowed ? "shadow_msg" : "text",
      replyTo: item.replyTo,
    };
    try {
      await persistRoomMessage({ message, roomId: item.roomId });
      removeOutboxMessage(item.id);
      onDelivered?.(item.roomId, item.id);
      delivered += 1;
    } catch {
      break;
    }
  }
  return delivered;
}
