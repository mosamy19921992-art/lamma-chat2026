import { supabase } from "../../lib/supabase";
import { userStoragePath } from "../storage/storagePaths";

const MAX_PROFILE_AVATAR_BYTES = 3 * 1024 * 1024;

export async function persistProfileAvatarToMetadata(
  avatar: string,
): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: "Supabase غير متصل حالياً." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { avatar: avatar.trim() },
  });

  if (error) {
    return { error: error.message || "تعذر حفظ الصورة." };
  }

  return {};
}

export async function uploadProfileAvatarFile(
  file: File,
  userId: string,
): Promise<{ url?: string; error?: string }> {
  if (!supabase) {
    return { error: "Supabase غير متصل حالياً." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "الملف المختار ليس صورة." };
  }

  if (file.size > MAX_PROFILE_AVATAR_BYTES) {
    return { error: "حجم الصورة كبير. الحد الأقصى 3MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  const objectPath = userStoragePath(
    userId,
    "profiles",
    `avatar-${Date.now()}.${safeExt}`,
  );

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message || "فشل رفع الصورة." };
  }

  const { data: publicData } = supabase.storage
    .from("chat-media")
    .getPublicUrl(objectPath);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    return { error: "تعذر إنشاء رابط الصورة." };
  }

  return { url: publicUrl };
}
