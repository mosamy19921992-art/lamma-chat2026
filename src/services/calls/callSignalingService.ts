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

export async function sendCallSignal(
  signal: Omit<CallSignalRow, "id" | "created_at">,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase غير متصل" };
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

    activeChannel = supabase
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
            void supabase.removeChannel(activeChannel);
            activeChannel = null;
          }
          retryTimer = setTimeout(attach, 2500);
        }
      });
  };

  attach();

  return () => {
    stopped = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }
  };
}
