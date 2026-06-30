import { supabase, type OwnerActivityLogRow } from "../../lib/supabase";

export async function syncOwnerActivityLog(
  payload: OwnerActivityLogRow,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("owner_activity_logs").insert(payload);
  if (error) {
    console.warn("Failed to sync owner activity log", error);
  }
}
