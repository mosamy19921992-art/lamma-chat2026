import { supabase } from "../../lib/supabase";
import type { OwnerMusicTrack } from "../../lib/chatTypes";
import { fetchServerUserRole } from "../auth/userRoleService";
import { normalizeAuthRole } from "../../lib/authProfile";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const AUDIO_TYPES = /^audio\//;

export function parseDjLibrary(raw: unknown): OwnerMusicTrack[] {
  if (!Array.isArray(raw)) return [];
  const tracks: OwnerMusicTrack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<OwnerMusicTrack>;
    if (typeof row.url !== "string" || !row.url.trim()) continue;
    tracks.push({
      id: String(row.id || crypto.randomUUID()),
      title: String(row.title || "أغنية").trim(),
      url: row.url.trim(),
      fileName: row.fileName ? String(row.fileName) : undefined,
      uploadedAt: String(row.uploadedAt || new Date().toISOString()),
    });
  }
  return tracks;
}

export async function uploadOwnerMusicFile(
  file: File,
): Promise<{ track?: OwnerMusicTrack; error?: string }> {
  if (!supabase) {
    return { error: "Supabase غير متصل. راجع إعدادات المشروع." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: "يجب تسجيل الدخول بحساب مسجل قبل رفع الأغاني." };
  }

  const metadataRole = normalizeAuthRole(
    typeof session.user.user_metadata?.role === "string"
      ? session.user.user_metadata.role
      : undefined,
  );
  const resolvedRole = await fetchServerUserRole(session.user.id);
  const effectiveRole = resolvedRole ?? metadataRole;
  if (effectiveRole !== "owner") {
    return {
      error:
        "رفع الأغاني للمالك فقط. سجّل دخول بـ mohamed.samy2821992@gmail.com (مش حساب الأدمن).",
    };
  }

  const { data: bucketData, error: bucketError } =
    await supabase.storage.getBucket("chat-media");
  if (bucketError || !bucketData) {
    return {
      error: `تخزين الأغاني غير جاهز: ${bucketError?.message || "bucket chat-media غير موجود"}.`,
    };
  }

  if (
    !AUDIO_TYPES.test(file.type) &&
    !/\.(mp3|wav|ogg|m4a|aac|webm|flac)$/i.test(file.name)
  ) {
    return { error: "الملف لازم يكون صوت (MP3, WAV, OGG, M4A…)." };
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return { error: "حجم الملف كبير. الحد الأقصى 20MB." };
  }

  const safeName = file.name.replace(/[^\w.\-أ-ي\s]+/gi, "_").slice(0, 80);
  const objectPath = `dj/${session.user.id}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type || "audio/mpeg",
      upsert: false,
    });

  if (uploadError) {
    const hint =
      uploadError.message.includes("Bucket not found") ||
      uploadError.message.includes("bucket")
        ? " تأكد أن bucket chat-media موجود في Supabase Storage."
        : uploadError.message.includes("row-level security") ||
            uploadError.message.includes("policy")
          ? " تأكد أنك داخل بحساب المالك (mohamed.samy2821992@gmail.com) وليس الأدمن."
          : "";
    return {
      error: `فشل رفع الأغنية: ${uploadError.message}.${hint}`,
    };
  }

  const { data: publicData } = supabase.storage
    .from("chat-media")
    .getPublicUrl(objectPath);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    return { error: "تعذر إنشاء رابط الأغنية بعد الرفع." };
  }

  const title =
    safeName.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim() || "أغنية المالك";

  return {
    track: {
      id: crypto.randomUUID(),
      title,
      url: publicUrl,
      fileName: safeName,
      uploadedAt: new Date().toISOString(),
    },
  };
}

export async function persistDjLibrary(
  settingsRowId: string,
  library: OwnerMusicTrack[],
): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: "Supabase غير متصل." };
  }

  const { error } = await supabase
    .from("owner_settings")
    .upsert(
      {
        id: settingsRowId,
        dj_library: library,
      },
      { onConflict: "id" },
    );

  if (error) {
    const hint = error.message.includes("row-level security")
      ? " سجّل دخول بحساب المالك mohamed.samy2821992@gmail.com ثم أعد المحاولة."
      : "";
    return {
      error: `تعذر حفظ قائمة الأغاني: ${error.message}.${hint}`,
    };
  }

  return {};
}

export async function removeDjTrackFromLibrary(
  settingsRowId: string,
  trackId: string,
  library: OwnerMusicTrack[],
): Promise<{ library: OwnerMusicTrack[]; error?: string }> {
  const next = library.filter((track) => track.id !== trackId);
  const { error } = await persistDjLibrary(settingsRowId, next);
  return { library: next, error };
}
