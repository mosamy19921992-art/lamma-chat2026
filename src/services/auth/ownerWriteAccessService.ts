import { normalizeAuthRole } from "../../lib/authProfile";
import { supabase } from "../../lib/supabase";
import { fetchServerUserRole } from "./userRoleService";

export interface OwnerWriteAccessResult {
  ok: boolean;
  reason: string;
  serverRole: string | null;
}

const WRITE_PROBE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} — انتهت المهلة (${ms / 1000}s)`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Verify Supabase session + server/metadata owner before writing owner tables. */
export async function checkOwnerWriteAccess(): Promise<OwnerWriteAccessResult> {
  if (!supabase) {
    return {
      ok: false,
      reason: "Supabase غير مفعّل — التعديلات محلية فقط.",
      serverRole: null,
    };
  }

  try {
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      WRITE_PROBE_TIMEOUT_MS,
      "جلسة الدخول",
    );
    const user = sessionResult.data.session?.user;
    if (!user) {
      return {
        ok: false,
        reason:
          "لا توجد جلسة Supabase نشطة — سجّل دخول بحساب المالك (ليس زائراً أو dev).",
        serverRole: null,
      };
    }

    const metaRole = normalizeAuthRole(
      typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : undefined,
    );
    const serverRole = await withTimeout(
      fetchServerUserRole(user.id),
      WRITE_PROBE_TIMEOUT_MS,
      "قراءة user_roles",
    );

    const effectiveRole = serverRole ?? metaRole;
    if (effectiveRole !== "owner") {
      return {
        ok: false,
        reason:
          serverRole && serverRole !== "owner"
            ? `دورك على السيرفر «${serverRole}» — لازم «owner» في جدول user_roles.`
            : "حسابك مش مضبوط كـ owner في Supabase (user_roles أو metadata.role).",
        serverRole: serverRole ?? metaRole,
      };
    }

    return { ok: true, reason: "", serverRole: effectiveRole };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: message,
      serverRole: null,
    };
  }
}

export function formatOwnerWriteDeniedMessage(reason: string): string {
  return (
    `⚠️ تعذر الحفظ على السيرفر.\n\n${reason}\n\n` +
    "الحل:\n" +
    "1. تأكد إنك مسجّل دخول بحساب المالك في Supabase\n" +
    "2. في SQL Editor نفّذ:\n" +
    "   insert into public.user_roles (user_id, role)\n" +
    "   values ('YOUR-USER-UUID', 'owner')\n" +
    "   on conflict (user_id) do update set role = 'owner';\n" +
    "3. شغّل supabase-final-apply.sql لو الجداول/السياسات ناقصة"
  );
}
