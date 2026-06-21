const SESSION_KEY = "lamma_chat_session_id";

export function getOrCreateChatSessionId(): string {
  if (typeof window === "undefined") return "server";
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export function clearChatSessionId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}
