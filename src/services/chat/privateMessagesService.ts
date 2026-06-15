import { supabase } from "../../lib/supabase";
import type { ChatMember, PMThreadMessage, UserSession } from "../../lib/chatTypes";

const MAX_PM_THREAD_MESSAGES = 100;
const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value?: string | null): value is string {
  return Boolean(value && UUID_LIKE_PATTERN.test(value));
}

function formatComposerTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function createOptimisticPmMessage(text: string): PMThreadMessage {
  return {
    text,
    isOwn: true,
    time: formatComposerTime(),
    status: "delivered",
  };
}

export function appendPmThreadMessage(
  thread: PMThreadMessage[],
  message: PMThreadMessage,
): PMThreadMessage[] {
  return [...thread, message].slice(-MAX_PM_THREAD_MESSAGES);
}

interface PersistPrivateMessageOptions {
  currentUser: UserSession;
  targetNickname: string;
  text: string;
  members: Pick<ChatMember, "id" | "nickname">[];
}

export async function persistPrivateMessage({
  currentUser,
  targetNickname,
  text,
  members,
}: PersistPrivateMessageOptions): Promise<void> {
  if (
    !supabase ||
    currentUser.authProvider !== "supabase" ||
    !currentUser.uid
  ) {
    return;
  }

  const receiver = members.find((member) => member.nickname === targetNickname);
  const receiverUid = receiver && isUuidLike(receiver.id) ? receiver.id : null;

  if (!receiverUid) {
    return;
  }

  const { error } = await supabase.from("pm_messages").insert([
    {
      sender_uid: currentUser.uid,
      sender_nickname: currentUser.nickname,
      receiver_uid: receiverUid,
      receiver_nickname: targetNickname,
      text,
      type: "text",
    },
  ]);

  if (error) {
    throw error;
  }
}
