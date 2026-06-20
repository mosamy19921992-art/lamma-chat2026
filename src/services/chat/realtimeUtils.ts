import { supabase } from "../../lib/supabase";

type ChannelBuilder = () => ReturnType<NonNullable<typeof supabase>["channel"]>;

export function subscribeChannelWithRetry(
  buildChannel: ChannelBuilder,
): () => void {
  if (!supabase) {
    return () => {};
  }

  let activeChannel: ReturnType<typeof supabase.channel> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const attach = () => {
    if (stopped || !supabase) return;
    const client = supabase;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    activeChannel = buildChannel().subscribe((status, err) => {
      if (stopped) return;

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[Realtime] Channel issue, retrying:", status, err);
        if (activeChannel) {
          void client.removeChannel(activeChannel);
          activeChannel = null;
        }
        retryTimer = setTimeout(() => {
          if (!stopped) attach();
        }, 2500);
      }
    });
  };

  attach();

  return () => {
    stopped = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (activeChannel) {
      void supabase?.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
