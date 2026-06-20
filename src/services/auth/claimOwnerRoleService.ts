import { supabase } from "../../lib/supabase";

const OWNER_EMAIL = "mohamed.samy2821992@gmail.com";

/** Try self-claim RPC after SQL migration (supabase-claim-owner-rpc.sql). */
export async function tryClaimOwnerRoleViaRpc(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!supabase) {
    return { ok: false, message: "Supabase غير متصل" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { ok: false, message: "سجّل دخول بحساب المالك أولاً" };
  }

  const { data, error } = await supabase.rpc("claim_owner_role_for_email", {
    p_email: OWNER_EMAIL,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return {
        ok: false,
        message:
          "دالة claim_owner غير موجودة بعد — شغّل supabase-claim-owner-rpc.sql على Supabase",
      };
    }
    return { ok: false, message: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return {
      ok: false,
      message: payload?.error || "فشل claim owner",
    };
  }

  return { ok: true, message: "تم تأكيد صلاحية المالك على السيرفر" };
}
