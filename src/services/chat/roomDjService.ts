import { supabase } from "../../lib/supabase";
import type { RoomDjState } from "../../lib/chatTypes";
import { filterSafeMediaUrl } from "../../lib/chatHelpers";

const SYNC_KEY_ATTR = "data-dj-sync-key";
const DJ_URL_ATTR = "data-dj-url";

export function parseRoomDjMap(raw: unknown): Record<string, RoomDjState> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, RoomDjState> = {};
  for (const [roomId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Partial<RoomDjState>;
    if (typeof v.url !== "string" || !v.url.trim()) continue;
    if (v.isPlaying === false) continue;
    const safeUrl = filterSafeMediaUrl(v.url.trim());
    if (!safeUrl) continue;
    result[roomId] = {
      mode: v.mode === "radio" || v.mode === "music" ? v.mode : "music",
      trackId: String(v.trackId || ""),
      title: String(v.title || "موسيقى"),
      url: safeUrl,
      isPlaying: Boolean(v.isPlaying),
      startedAtMs: Number(v.startedAtMs) || Date.now(),
      updatedBy: String(v.updatedBy || "المالك"),
      updatedAtMs: Number(v.updatedAtMs) || Date.now(),
    };
  }
  return result;
}

/** يحسب وقت بداية الأغنية على الساعة الحائطية من موضع التشغيل الحالي */
export function computeDjStartedAtMs(
  positionSec: number,
  nowMs = Date.now(),
): number {
  return nowMs - Math.max(0, positionSec) * 1000;
}

/** الموضع المتوقع للأغنية الآن بناءً على startedAtMs */
export function expectedDjPositionSec(
  dj: RoomDjState,
  nowMs = Date.now(),
): number {
  if (!dj.isPlaying || !dj.startedAtMs) return 0;
  return Math.max(0, (nowMs - dj.startedAtMs) / 1000);
}

function buildSyncKey(dj: RoomDjState): string {
  return `${dj.trackId}|${dj.url}|${dj.startedAtMs}|${dj.isPlaying}`;
}

function seekToExpectedPosition(
  audio: HTMLAudioElement,
  dj: RoomDjState,
  minDriftSec = 0.35,
): void {
  if (dj.mode !== "music" || !dj.startedAtMs) return;

  const target = expectedDjPositionSec(dj);
  if (!Number.isFinite(target) || target <= 0) return;

  const duration = audio.duration;
  if (
    Number.isFinite(duration) &&
    duration > 0 &&
    target >= duration - 0.25
  ) {
    return;
  }

  if (Math.abs(audio.currentTime - target) <= minDriftSec) return;

  try {
    audio.currentTime = target;
  } catch {
    // not seekable yet
  }
}

export function syncDjAudioDrift(
  audio: HTMLAudioElement,
  dj: RoomDjState,
  driftThresholdSec = 1.2,
): boolean {
  if (!dj.isPlaying || dj.mode !== "music") return false;

  const expected = expectedDjPositionSec(dj);
  const duration = audio.duration;
  if (
    Number.isFinite(duration) &&
    duration > 0 &&
    expected >= duration - 0.5
  ) {
    return false;
  }

  const drift = expected - audio.currentTime;
  if (Math.abs(drift) <= driftThresholdSec) return false;

  seekToExpectedPosition(audio, dj, 0.05);
  return true;
}

export async function persistRoomDjState(
  settingsRowId: string,
  roomId: string,
  state: RoomDjState | null,
  currentMap: Record<string, RoomDjState>,
): Promise<{ map: Record<string, RoomDjState>; error: string | null }> {
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
      return { map: currentMap, error: error.message };
    }
  }

  return { map: next, error: null };
}

/** يطبّق بث DJ على عنصر الصوت — يرجع cleanup لإزالة المؤقتات والمستمعين */
export function applyRoomDjToAudio(
  audio: HTMLAudioElement,
  dj: RoomDjState | undefined,
  options?: { listenEnabled?: boolean },
): () => void {
  const cleanupFns: Array<() => void> = [];
  const cleanup = () => {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
  };

  const listenEnabled = options?.listenEnabled !== false;

  if (!listenEnabled || !dj?.isPlaying) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio.removeAttribute(DJ_URL_ATTR);
    audio.removeAttribute(SYNC_KEY_ATTR);
    return cleanup;
  }

  audio.preload = "auto";

  const syncKey = buildSyncKey(dj);
  const prevSyncKey = audio.getAttribute(SYNC_KEY_ATTR);
  const prevUrl = audio.getAttribute(DJ_URL_ATTR);
  const urlChanged = prevUrl !== dj.url;

  const startPlayback = () => {
    seekToExpectedPosition(audio, dj);
    void audio.play().catch(() => {});
  };

  if (
    !urlChanged &&
    prevSyncKey === syncKey &&
    !audio.paused &&
    audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
  ) {
    const driftTimer = window.setInterval(() => {
      if (audio.paused || !dj.isPlaying) return;
      syncDjAudioDrift(audio, dj);
    }, 3000);
    cleanupFns.push(() => window.clearInterval(driftTimer));
    return cleanup;
  }

  if (urlChanged) {
    audio.setAttribute(DJ_URL_ATTR, dj.url);
    audio.setAttribute(SYNC_KEY_ATTR, syncKey);
    audio.src = dj.url;
    audio.load();
  } else if (prevSyncKey !== syncKey) {
    audio.setAttribute(SYNC_KEY_ATTR, syncKey);
    startPlayback();
  } else if (audio.paused) {
    startPlayback();
  }

  if (
    urlChanged ||
    audio.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
  ) {
    const onReady = () => {
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("loadedmetadata", onMetadata);
      startPlayback();
    };
    const onMetadata = () => {
      seekToExpectedPosition(audio, dj);
    };

    audio.addEventListener("canplaythrough", onReady);
    audio.addEventListener("loadedmetadata", onMetadata);
    cleanupFns.push(() => {
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("loadedmetadata", onMetadata);
    });

    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      onReady();
    }
  }

  const driftTimer = window.setInterval(() => {
    if (audio.paused || !dj.isPlaying) return;
    syncDjAudioDrift(audio, dj);
  }, 3000);
  cleanupFns.push(() => window.clearInterval(driftTimer));

  return cleanup;
}
