import { supabase } from "../../lib/supabase";

export interface TempEntryTopicMetadata {
  text: string;
  enabled: boolean;
}

export async function fetchTempEntryTopicMetadata(): Promise<TempEntryTopicMetadata | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn("Failed to load temp entry topic metadata:", error);
    return null;
  }

  const metadata = data.user?.user_metadata ?? {};
  const text =
    typeof metadata.temp_entry_topic === "string"
      ? metadata.temp_entry_topic.trim().slice(0, 60)
      : "";
  const enabled =
    metadata.temp_entry_topic_enabled === true && Boolean(text);

  if (!text && metadata.temp_entry_topic_enabled !== true) {
    return null;
  }

  return { text, enabled };
}

export async function updateAuthNicknameMetadata(
  nickname: string,
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase client is not configured.") };
  }

  const { error } = await supabase.auth.updateUser({
    data: { nickname: nickname.trim() },
  });

  return { error: error ? new Error(error.message) : null };
}

export async function updateTempEntryTopicMetadata(
  topic: string,
  enabled: boolean,
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase client is not configured.") };
  }

  const sanitizedTopic = topic.trim().slice(0, 60);
  const nextEnabled = enabled && Boolean(sanitizedTopic);

  const { error } = await supabase.auth.updateUser({
    data: {
      temp_entry_topic: sanitizedTopic,
      temp_entry_topic_enabled: nextEnabled,
    },
  });

  return { error: error ? new Error(error.message) : null };
}
