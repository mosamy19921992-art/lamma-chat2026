export const TEMP_ENTRY_TOPIC_MAX_LEN = 60;

export function buildTempEntryTopicStorageKey(userKey: string): string {
  return `lamma_temp_entry_topic_${userKey}`;
}

export function sanitizeTempEntryTopic(text: string): string {
  return text.trim().slice(0, TEMP_ENTRY_TOPIC_MAX_LEN);
}

export function readStoredTempEntryTopic(storageKey: string): {
  text: string;
  enabled: boolean;
} {
  if (typeof window === "undefined") {
    return { text: "", enabled: false };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { text: "", enabled: false };
    const parsed = JSON.parse(raw) as {
      text?: string;
      enabled?: boolean;
    };
    const text =
      typeof parsed.text === "string"
        ? sanitizeTempEntryTopic(parsed.text)
        : "";
    return {
      text,
      enabled: parsed.enabled === true && Boolean(text),
    };
  } catch {
    return { text: "", enabled: false };
  }
}

export function persistTempEntryTopic(
  storageKey: string,
  text: string,
  enabled: boolean,
): void {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeTempEntryTopic(text);
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      text: sanitized,
      enabled: enabled && Boolean(sanitized),
    }),
  );
}
