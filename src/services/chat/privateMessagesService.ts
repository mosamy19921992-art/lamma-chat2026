import { supabase } from "../../lib/supabase";
import { isSafeHttpUrl } from "../../lib/chatHelpers";
import { requireAuthenticatedUid } from "../auth/guestAuthService";
import { userStoragePath } from "../storage/storagePaths";
import {
  uploadPrivateMediaFile as uploadToPrivateBucket,
} from "../storage/mediaStorageService";
import type { ChatMember, PMThreadMessage, UserSession } from "../../lib/chatTypes";
import type { PersistedPrivateMessage, PrivateMessageType } from "../../lib/socialTypes";
import { resolveReceiverUid } from "../social/userProfileService";

const MAX_PM_THREAD_MESSAGES = 100;

function formatComposerTime(): string {
  return new Date().toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function createOptimisticPmMessage(
  text: string,
  options?: { type?: PrivateMessageType; mediaUrl?: string },
): PMThreadMessage {
  return {
    text,
    isOwn: true,
    time: formatComposerTime(),
    status: "delivered",
    type: options?.type || "text",
    mediaUrl: options?.mediaUrl,
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
  type?: PrivateMessageType;
  mediaUrl?: string;
  members: Pick<ChatMember, "id" | "nickname">[];
}

function createLocalPrivateMessage(
  text: string,
  type: PrivateMessageType = "text",
  mediaUrl?: string,
): PersistedPrivateMessage {
  return {
    id: `local-pm-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
    text,
    type,
    media_url: mediaUrl,
  };
}

export async function persistPrivateMessage({
  currentUser,
  targetNickname,
  text,
  type = "text",
  mediaUrl,
  members,
}: PersistPrivateMessageOptions): Promise<PersistedPrivateMessage> {
  if (!currentUser.uid) {
    throw new Error("تعذر إرسال الرسالة الخاصة بدون معرف جلسة.");
  }

  const receiverUid = await resolveReceiverUid(targetNickname, members);
  const trimmedText = text.trim();

  if (!supabase) {
    return createLocalPrivateMessage(trimmedText, type, mediaUrl);
  }

  if (currentUser.authProvider !== "guest" && !receiverUid) {
    throw new Error(
      "تعذر تحديد الطرف الآخر. تأكد أن العضو مسجّل ومتصل أو جرّب لاحقاً.",
    );
  }

  const senderUid = await requireAuthenticatedUid();
  const safeMedia =
    mediaUrl && isSafeHttpUrl(mediaUrl) ? mediaUrl.slice(0, 2048) : null;

  const { data, error } = await supabase
    .from("pm_messages")
    .insert([
      {
        sender_uid: senderUid,
        receiver_uid: receiverUid,
        receiver_nickname: targetNickname,
        text: trimmedText.slice(0, 4000),
        type,
        media_url: safeMedia,
      },
    ])
    .select("id, created_at, text, type, media_url")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("تعذر تأكيد حفظ الرسالة الخاصة.");
  }

  return data;
}

export async function markPrivateMessagesAsRead(
  messageIds: string[],
): Promise<void> {
  if (!supabase || messageIds.length === 0) return;

  const { error } = await supabase
    .from("pm_messages")
    .update({ is_read: true })
    .in("id", messageIds);

  if (error) {
    console.warn("Failed to mark PM as read:", error.message);
  }
}

export async function uploadPrivateMediaFile(
  file: File,
  targetNickname: string,
): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase غير متصل.");
  }

  const uid = await requireAuthenticatedUid();
  const target = targetNickname.replace(/[^\w.\-]+/g, "_") || "unknown";
  const subfolder = `pm/${target}`;

  const { signedUrl, error } = await uploadToPrivateBucket(file, uid, subfolder);

  if (error || !signedUrl) {
    throw new Error(error || "تعذر رفع الوسائط الخاصة.");
  }

  return signedUrl;
}
