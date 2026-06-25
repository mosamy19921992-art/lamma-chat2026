import { supabase } from "../../lib/supabase";

export type CallSignalType =
  | "ring"
  | "offer"
  | "answer"
  | "ice"
  | "accept"
  | "reject"
  | "hangup"
  | "server-switch";

export interface CallSignalRow {
  id: string;
  created_at: string;
  call_id: string;
  from_uid: string;
  from_nickname: string;
  to_uid: string;
  to_nickname: string;
  call_type: "audio" | "video";
  signal_type: CallSignalType;
  payload: Record<string, unknown>;
}

type IceSignalMeta = Omit<CallSignalRow, "id" | "created_at" | "signal_type" | "payload">;

const ICE_FLUSH_MS = 40;
const ICE_MAX_BATCH = 12;

interface IceQueueEntry {
  meta: IceSignalMeta;
  candidates: RTCIceCandidateInit[];
  timer: ReturnType<typeof setTimeout> | null;
}

const iceQueues = new Map<string, IceQueueEntry>();

function iceQueueKey(meta: IceSignalMeta): string {
  return `${meta.call_id}:${meta.from_uid}:${meta.to_uid}`;
}

async function flushIceQueue(key: string): Promise<void> {
  const entry = iceQueues.get(key);
  if (!entry || entry.candidates.length === 0) return;

  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }

  const batch = entry.candidates.splice(0, ICE_MAX_BATCH);
  if (entry.candidates.length > 0) {
    entry.timer = setTimeout(() => {
      void flushIceQueue(key);
    }, ICE_FLUSH_MS);
  } else {
    iceQueues.delete(key);
  }

  const { error } = await supabase!.from("call_signals").insert([
    {
      ...entry.meta,
      signal_type: "ice" as const,
      payload: { candidates: batch },
    },
  ]);
  if (error) {
    console.warn("[Calls] ICE batch insert failed:", error.message);
  }
}

export function queueCallIceSignal(
  meta: IceSignalMeta,
  candidate: RTCIceCandidateInit,
): void {
  if (!supabase || !candidate?.candidate) return;

  const key = iceQueueKey(meta);
  let entry = iceQueues.get(key);
  if (!entry) {
    entry = { meta, candidates: [], timer: null };
    iceQueues.set(key, entry);
  }

  entry.candidates.push(candidate);

  if (entry.candidates.length >= ICE_MAX_BATCH) {
    void flushIceQueue(key);
    return;
  }

  if (!entry.timer) {
    entry.timer = setTimeout(() => {
      void flushIceQueue(key);
    }, ICE_FLUSH_MS);
  }
}

export async function flushAllIceQueues(): Promise<void> {
  const keys = [...iceQueues.keys()];
  await Promise.all(keys.map((key) => flushIceQueue(key)));
}

export function extractIceCandidates(
  payload: Record<string, unknown>,
): RTCIceCandidateInit[] {
  const batched = payload.candidates;
  if (Array.isArray(batched)) {
    return batched.filter(
      (c): c is RTCIceCandidateInit =>
        Boolean(c && typeof c === "object" && (c as RTCIceCandidateInit).candidate),
    );
  }
  const single = payload.candidate;
  if (single && typeof single === "object" && (single as RTCIceCandidateInit).candidate) {
    return [single as RTCIceCandidateInit];
  }
  return [];
}

export async function sendCallSignal(
  signal: Omit<CallSignalRow, "id" | "created_at">,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متصل" };

  if (signal.signal_type === "ice") {
    const candidate = signal.payload.candidate as RTCIceCandidateInit | undefined;
    if (candidate?.candidate) {
      queueCallIceSignal(signal, candidate);
    }
    return { error: null };
  }

  if (signal.signal_type === "hangup") {
    await flushAllIceQueues();
  }

  const { error } = await supabase.from("call_signals").insert([signal]);
  return { error: error?.message ?? null };
}

export async function fetchLatestOffer(
  callId: string,
): Promise<RTCSessionDescriptionInit | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("call_signals")
    .select("payload")
    .eq("call_id", callId)
    .eq("signal_type", "offer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sdp = data?.payload?.sdp;
  return sdp && typeof sdp === "object" ? (sdp as RTCSessionDescriptionInit) : null;
}

const RECENT_SIGNALS_MS = 45_000;

export async function fetchRecentIncomingSignals(
  myUid: string,
): Promise<CallSignalRow[]> {
  if (!supabase || !myUid) return [];
  const since = new Date(Date.now() - RECENT_SIGNALS_MS).toISOString();
  const { data, error } = await supabase
    .from("call_signals")
    .select("*")
    .eq("to_uid", myUid)
    .neq("signal_type", "ring")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(80);
  if (error) {
    console.warn("[Calls] Recent signals fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as CallSignalRow[];
}

export function subscribeToCallSignals(
  myUid: string,
  onSignal: (signal: CallSignalRow) => void,
): () => void {
  if (!supabase || !myUid) return () => {};

  let activeChannel: ReturnType<typeof supabase.channel> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const attach = () => {
    if (stopped || !supabase || !myUid) return;
    const client = supabase;

    void fetchRecentIncomingSignals(myUid).then((rows) => {
      if (stopped) return;
      for (const row of rows) {
        onSignal(row);
      }
    });

    activeChannel = client
      .channel(`call_signals:${myUid}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `to_uid=eq.${myUid}`,
        },
        (payload) => {
          onSignal(payload.new as CallSignalRow);
        },
      )
      .subscribe((status, err) => {
        if (stopped) return;

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[Calls] Signal channel error:", status, err);
          if (activeChannel) {
            void client.removeChannel(activeChannel);
            activeChannel = null;
          }
          retryTimer = setTimeout(attach, 1500);
        }
      });
  };

  attach();

  return () => {
    stopped = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    if (activeChannel && supabase) {
      supabase.removeChannel(activeChannel);
    }
    void flushAllIceQueues();
  };
}
