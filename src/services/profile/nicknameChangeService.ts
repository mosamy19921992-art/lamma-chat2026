import { supabase, type NicknameChangeRequestRow } from "../../lib/supabase";

export async function fetchNicknameChangeRequests(options: {
  userId: string;
  isOwner: boolean;
}): Promise<NicknameChangeRequestRow[]> {
  if (!supabase) return [];

  let query = supabase
    .from("nickname_change_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.isOwner ? 100 : 10);

  if (!options.isOwner) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch nickname change requests:", error);
    return [];
  }

  return (data as NicknameChangeRequestRow[]) || [];
}

export async function submitNicknameChangeRequest(input: {
  userId: string;
  userEmail: string | null;
  currentNickname: string;
  requestedNickname: string;
}): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase client is not configured.") };
  }

  const { error } = await supabase.from("nickname_change_requests").insert({
    user_id: input.userId,
    user_email: input.userEmail,
    current_nickname: input.currentNickname,
    requested_nickname: input.requestedNickname.trim(),
    status: "pending",
  });

  return { error: error ? new Error(error.message) : null };
}

export async function processNicknameChangeRequest(input: {
  requestId: string;
  status: "approved" | "rejected";
  processedBy: string;
}): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase client is not configured.") };
  }

  const { error } = await supabase
    .from("nickname_change_requests")
    .update({
      status: input.status,
      processed_at: new Date().toISOString(),
      processed_by: input.processedBy,
    })
    .eq("id", input.requestId);

  return { error: error ? new Error(error.message) : null };
}
