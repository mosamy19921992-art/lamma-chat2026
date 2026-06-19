import { supabase } from "../../lib/supabase";
import { userStoragePath } from "../storage/storagePaths";

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

  const objectPath = userStoragePath(
    userId,
    "voice",
    roomId,
    `${Date.now()}_${crypto.randomUUID()}.${ext}`,
  );

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(objectPath, blob, {
      cacheControl: "3600",
      contentType: blob.type || "audio/webm",
      upsert: false,
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("chat-media").getPublicUrl(objectPath);
  return { url: data?.publicUrl ?? null, error: null };
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
