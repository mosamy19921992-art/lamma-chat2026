import { supabase } from "../../lib/supabase";
import { uploadPrivateMediaFile as uploadToPrivateBucket } from "../storage/mediaStorageService";

export async function uploadVoiceNoteBlob(
  blob: Blob,
  roomId: string,
  userId: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: "Supabase غير متصل" };

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

  const { signedUrl, error } = await uploadToPrivateBucket(file, userId, subfolder);

  if (error || !signedUrl) {
    return { url: null, error: error || "فشل رفع المقطع الصوتي." };
  }

  return { url: signedUrl, error: null };
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
