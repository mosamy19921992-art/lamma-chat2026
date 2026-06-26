const STORAGE_KEY = "lamma_tab_leader_v1";
const HEARTBEAT_MS = 2000;
const STALE_MS = 6000;

function createTabSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Stable per browser tab — used for presence keys and leader election. */
export const TAB_SESSION_ID = createTabSessionId();

type LeaderRecord = {
  tabId: string;
  at: number;
};

function readLeaderRecord(): LeaderRecord | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeaderRecord;
    if (!parsed?.tabId || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLeaderHeartbeat(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tabId: TAB_SESSION_ID, at: Date.now() } satisfies LeaderRecord),
    );
  } catch {
    // quota / private mode
  }
}

function releaseLeadership(): void {
  const current = readLeaderRecord();
  if (current?.tabId !== TAB_SESSION_ID) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function computeIsLeader(): boolean {
  const record = readLeaderRecord();
  const now = Date.now();
  if (!record || now - record.at > STALE_MS) {
    writeLeaderHeartbeat();
    return readLeaderRecord()?.tabId === TAB_SESSION_ID;
  }
  return record.tabId === TAB_SESSION_ID;
}

/**
 * Elects one "leader" tab per browser profile to own PM/call/alert realtime
 * subscriptions. Uses localStorage heartbeat + storage events (no extra WS).
 */
export function startTabLeaderElection(
  onChange: (isLeader: boolean) => void,
): () => void {
  if (typeof window === "undefined") {
    onChange(true);
    return () => {};
  }

  let stopped = false;
  let isLeader = computeIsLeader();
  onChange(isLeader);

  const sync = () => {
    if (stopped) return;
    const next = computeIsLeader();
    if (next !== isLeader) {
      isLeader = next;
      onChange(isLeader);
    }
    if (isLeader) {
      writeLeaderHeartbeat();
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) sync();
  };

  const onPageHide = () => {
    if (isLeader) releaseLeadership();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", onPageHide);

  const heartbeat = window.setInterval(() => {
    if (stopped) return;
    if (isLeader) {
      writeLeaderHeartbeat();
    } else {
      sync();
    }
  }, HEARTBEAT_MS);

  const watch = window.setInterval(sync, HEARTBEAT_MS + 500);

  return () => {
    stopped = true;
    window.clearInterval(heartbeat);
    window.clearInterval(watch);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("beforeunload", onPageHide);
    if (isLeader) releaseLeadership();
  };
}
