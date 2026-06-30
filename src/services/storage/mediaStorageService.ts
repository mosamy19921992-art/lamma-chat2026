import { supabase } from "../../lib/supabase";

export const PRIVATE_MEDIA_BUCKET = "chat-media-private";
export const PUBLIC_MEDIA_BUCKET = "chat-media";
export const DESIGN_ASSETS_BUCKET = "design-assets";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours (playback re-signs via resolveMediaUrl)
const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();

function getCachedSignedUrl(objectPath: string): string | null {
  const hit = SIGNED_URL_CACHE.get(objectPath);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now() + 60_000) {
    SIGNED_URL_CACHE.delete(objectPath);
    return null;
  }
  return hit.url;
}

function rememberSignedUrl(objectPath: string, url: string): void {
  SIGNED_URL_CACHE.set(objectPath, {
    url,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });
  if (SIGNED_URL_CACHE.size > 256) {
    const oldest = SIGNED_URL_CACHE.keys().next().value;
    if (oldest) SIGNED_URL_CACHE.delete(oldest);
  }
}

export function formatPrivateMediaRef(objectPath: string): string {
  return `${PRIVATE_MEDIA_BUCKET}/${objectPath}`;
}

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
  const cached = getCachedSignedUrl(objectPath);
  if (cached) return cached;

  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  rememberSignedUrl(objectPath, data.signedUrl);
  return data.signedUrl;
}

const ALLOWED_PRIVATE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
  "audio/aac",
  "audio/x-m4a",
  "video/mp4",
  "video/webm",
];

const MAX_PRIVATE_FILE_BYTES = 25 * 1024 * 1024;

export async function uploadPrivateMediaFile(
  file: File,
  uid: string,
  subfolder: string,
): Promise<{ path: string; signedUrl: string | null; error?: string }> {
  if (!supabase) {
    return { path: "", signedUrl: null, error: "Supabase not configured" };
  }

  const baseType = ((file.type || "").split(";")[0] ?? "").trim();
  if (baseType && !ALLOWED_PRIVATE_MIME_TYPES.some((t) => baseType === t)) {
    return { path: "", signedUrl: null, error: "نوع الملف غير مدعوم." };
  }

  if (file.size > MAX_PRIVATE_FILE_BYTES) {
    return { path: "", signedUrl: null, error: "حجم الملف يتجاوز الحد المسموح (25MB)." };
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
    const hint = uploadError.message.includes("Bucket not found")
      ? " — أنشئ bucket «chat-media-private» من Supabase أو شغّل: node scripts/apply-private-media-bucket.mjs"
      : "";
    return {
      path: objectPath,
      signedUrl: null,
      error: `${uploadError.message}${hint}`,
    };
  }

  const signedUrl = await signPrivatePath(objectPath);
  return { path: objectPath, signedUrl };
}

export async function uploadPublicRoomMediaFile(
  file: File | Blob,
  objectPath: string,
  contentType: string,
): Promise<{ publicUrl: string | null; error?: string }> {
  if (!supabase) {
    return { publicUrl: null, error: "Supabase not configured" };
  }

  const { error: uploadError } = await supabase.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return { publicUrl: null, error: uploadError.message };
  }

  const { data: publicData } = supabase.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .getPublicUrl(objectPath);

  return { publicUrl: publicData?.publicUrl ?? null };
}

export async function uploadDesignAssetFile(
  file: File,
  objectPath: string,
): Promise<{ publicUrl: string | null; error?: string }> {
  if (!supabase) {
    return { publicUrl: null, error: "Supabase not configured" };
  }

  const { error: uploadError } = await supabase.storage
    .from(DESIGN_ASSETS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { publicUrl: null, error: uploadError.message };
  }

  const { data: publicData } = supabase.storage
    .from(DESIGN_ASSETS_BUCKET)
    .getPublicUrl(objectPath);

  return { publicUrl: publicData?.publicUrl ?? null };
}
