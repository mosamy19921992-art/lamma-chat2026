import { supabase } from "../../lib/supabase";
import { formatSupabaseUserError } from "../../lib/supabaseErrors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanAuthorLabel(author: string): string {
  return author
    .replace(/\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g, "")
    .trim();
}

export async function deleteRoomMessagesByMember(
  roomId: string,
  targetUid: string | null | undefined,
  targetNickname: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: false, error: "Supabase غير متصل." };
  }

  const uid = targetUid?.trim();
  let query = supabase.from("messages").delete().eq("room_id", roomId);

  if (uid && UUID_RE.test(uid)) {
    query = query.eq("sender_uid", uid);
  } else {
    const label = cleanAuthorLabel(targetNickname);
    if (!label) {
      return { ok: false, error: "لا يمكن تحديد العضو لحذف رسائله." };
    }
    query = query.ilike("author", `%${label}%`);
  }

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      error: formatSupabaseUserError(error, "تعذر حذف رسائل العضو."),
    };
  }

  return { ok: true };
}
