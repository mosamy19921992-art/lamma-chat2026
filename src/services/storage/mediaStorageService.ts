import { supabase } from "../../lib/supabase";

export const PRIVATE_MEDIA_BUCKET = "chat-media-private";
export const PUBLIC_MEDIA_BUCKET = "chat-media";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Resolve a stored media URL — signed for private bucket paths. */
export async function resolveMediaUrl(
  urlOrPath: string | null | undefined,
): Promise<string | null> {
  if (!urlOrPath) return null;

  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    if (!urlOrPath.includes(PRIVATE_MEDIA_BUCKET)) {
      return urlOrPath;
    }
    const objectPath = extractPrivateObjectPath(urlOrPath);
    if (!objectPath) return urlOrPath;
    return signPrivatePath(objectPath);
  }

  if (urlOrPath.startsWith(`${PRIVATE_MEDIA_BUCKET}/`)) {
    return signPrivatePath(urlOrPath.slice(PRIVATE_MEDIA_BUCKET.length + 1));
  }

  return urlOrPath;
}

function extractPrivateObjectPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${PRIVATE_MEDIA_BUCKET}/`;
  const signedMarker = `/storage/v1/object/sign/${PRIVATE_MEDIA_BUCKET}/`;
  const idx =
    publicUrl.indexOf(marker) >= 0
      ? publicUrl.indexOf(marker) + marker.length
      : publicUrl.indexOf(signedMarker) >= 0
        ? publicUrl.indexOf(signedMarker) + signedMarker.length
        : -1;
  if (idx < 0) return null;
  return decodeURIComponent(publicUrl.slice(idx).split("?")[0] ?? "");
}

async function signPrivatePath(objectPath: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadPrivateMediaFile(
  file: File,
  uid: string,
  subfolder: string,
): Promise<{ path: string; signedUrl: string | null; error?: string }> {
  if (!supabase) {
    return { path: "", signedUrl: null, error: "Supabase not configured" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const objectPath = `${uid}/${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    return { path: objectPath, signedUrl: null, error: uploadError.message };
  }

  const signedUrl = await signPrivatePath(objectPath);
  return { path: objectPath, signedUrl };
}
