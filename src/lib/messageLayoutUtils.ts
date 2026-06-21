import type { Message } from "./chatTypes";

/** Rough row height for virtual list — reduces remeasure thrash on mixed content. */
export function estimateMessageRowHeight(msg: Message): number {
  switch (msg.type) {
    case "image":
      return 228;
    case "video":
    case "youtube":
      return 208;
    case "audio":
      return 104;
    case "gift":
      return 92;
    case "system":
    case "join":
    case "leave":
      return 56;
    default:
      return msg.text.length > 140 ? 104 : msg.text.length > 60 ? 88 : 72;
  }
}
