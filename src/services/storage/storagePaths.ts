/** User-scoped storage paths — first folder must match auth.uid() (RLS enforced). */
export function userStoragePath(
  uid: string,
  ...segments: string[]
): string {
  const safeUid = uid.replace(/[^\w-]/g, "");
  const safeSegments = segments.map((segment) =>
    segment.replace(/[^\w.\-/]+/g, "_"),
  );
  return [safeUid, ...safeSegments].filter(Boolean).join("/");
}
