/** Map PostgREST / Supabase errors to user-facing Arabic hints. */
export function isRlsDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { code?: string; message?: string };
  if (rec.code === "42501") return true;
  const msg = (rec.message || "").toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("not_authorized") ||
    msg.includes("permission denied")
  );
}

export function formatSupabaseUserError(
  error: unknown,
  fallback = "تعذر تنفيذ العملية.",
): string {
  if (isRlsDenied(error)) {
    return "🛡️ السيرفر رفض العملية — لا تملك الصلاحية أو أنت محظور/مكتوم.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message || "").trim();
    if (msg) return msg;
  }
  return fallback;
}
