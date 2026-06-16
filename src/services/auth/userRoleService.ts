import { normalizeAuthRole, type AuthRole } from "../../lib/authProfile";
import { supabase } from "../../lib/supabase";

/** Server-side role from `user_roles` — takes precedence over auth metadata. */
export async function fetchServerUserRole(
  userId: string,
): Promise<AuthRole | null> {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch user_roles:", error.message);
    return null;
  }

  if (!data?.role || typeof data.role !== "string") return null;
  return normalizeAuthRole(data.role);
}

export async function mergeSessionRole(
  userId: string,
  metadataRole: AuthRole,
): Promise<AuthRole> {
  const serverRole = await fetchServerUserRole(userId);
  if (serverRole) return serverRole;
  return metadataRole;
}
