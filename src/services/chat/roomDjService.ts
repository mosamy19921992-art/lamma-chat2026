import { supabase } from "../../lib/supabase";
import type { RoomDjState } from "../../lib/chatTypes";

export function parseRoomDjMap(raw: unknown): Record<string, RoomDjState> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, RoomDjState> = {};
  for (const [roomId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Partial<RoomDjState>;
    if (typeof v.url !== "string" || !v.url.trim()) continue;
    result[roomId] = {
      mode: v.mode === "radio" || v.mode === "music" ? v.mode : "music",
      trackId: String(v.trackId || ""),
      title: String(v.title || "موسيقى"),
      url: v.url.trim(),
      isPlaying: Boolean(v.isPlaying),
      startedAtMs: Number(v.startedAtMs) || Date.now(),
      updatedBy: String(v.updatedBy || "المالك"),
      updatedAtMs: Number(v.updatedAtMs) || Date.now(),
    };
  }
  return result;
}

export async function persistRoomDjState(
  settingsRowId: string,
  roomId: string,
  state: RoomDjState | null,
  currentMap: Record<string, RoomDjState>,
): Promise<Record<string, RoomDjState>> {
  const next = { ...currentMap };
  if (state?.isPlaying) {
    next[roomId] = state;
  } else {
    delete next[roomId];
  }

  if (supabase) {
    const { error } = await supabase
      .from("owner_settings")
      .update({ room_dj_map: next })
      .eq("id", settingsRowId);
    if (error) {
      console.warn("Failed to sync room DJ state", error);
    }
  }

  return next;
}

export function applyRoomDjToAudio(
  audio: HTMLAudioElement,
  dj: RoomDjState | undefined,
  options?: { listenEnabled?: boolean },
): void {
  const listenEnabled = options?.listenEnabled !== false;

  if (!listenEnabled || !dj?.isPlaying) {
    audio.pause();
    audio.removeAttribute("data-dj-url");
    return;
  }

  const currentDjUrl = audio.getAttribute("data-dj-url");
  if (currentDjUrl !== dj.url) {
    audio.setAttribute("data-dj-url", dj.url);
    audio.src = dj.url;
    audio.load();
  }

  const playSynced = () => {
    if (dj.mode === "music" && dj.startedAtMs) {
      const elapsed = (Date.now() - dj.startedAtMs) / 1000;
      if (
        Number.isFinite(elapsed) &&
        elapsed > 0 &&
        audio.duration &&
        Number.isFinite(audio.duration) &&
        elapsed < audio.duration - 0.5
      ) {
        audio.currentTime = elapsed;
      }
    }
    void audio.play().catch(() => {});
  };

  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    playSynced();
    return;
  }

  const onReady = () => {
    audio.removeEventListener("canplay", onReady);
    playSynced();
  };
  audio.addEventListener("canplay", onReady);
}
