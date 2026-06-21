import { supabase } from "../../lib/supabase";
import {
  formatPrivateMediaRef,
  uploadPrivateMediaFile as uploadToPrivateBucket,
} from "../storage/mediaStorageService";

export const MAX_VOICE_NOTE_BYTES = 5 * 1024 * 1024;
export const MAX_VOICE_NOTE_SECONDS = 120;

export async function uploadVoiceNoteBlob(
  blob: Blob,
  roomId: string,
  userId: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: "Supabase غير متصل" };

  if (blob.size > MAX_VOICE_NOTE_BYTES) {
    return {
      url: null,
      error: "حجم الرسالة الصوتية كبير. الحد الأقصى 5MB.",
    };
  }

  const ext = blob.type.includes("webm")
    ? "webm"
    : blob.type.includes("mp4") || blob.type.includes("aac")
      ? "m4a"
      : blob.type.includes("ogg")
        ? "ogg"
        : "webm";

  const subfolder = `voice/${roomId.replace(/[^\w.-]+/g, "_")}`;
  const file = new File([blob], `voice.${ext}`, {
    type: blob.type || "audio/webm",
  });

  const { path, error } = await uploadToPrivateBucket(file, userId, subfolder);

  if (error || !path) {
    const msg = error || "فشل رفع المقطع الصوتي.";
    return {
      url: null,
      error: msg.includes("Bucket not found") || msg.includes("chat-media-private")
        ? "❌ bucket التخزين الخاص غير موجود. تواصل مع المالك لتفعيل chat-media-private على Supabase."
        : msg,
    };
  }

  return { url: formatPrivateMediaRef(path), error: null };
}

export function pickVoiceRecorderMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return undefined;
}
