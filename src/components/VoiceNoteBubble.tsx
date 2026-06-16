import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";

function formatDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VoiceNoteBubble({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTime = () => setCurrent(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const shown = playing ? current : duration;
  const progress =
    duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div
      className="mt-2 inline-flex items-center gap-2 rounded-2xl px-3 py-2 min-w-[200px] max-w-[320px] lamma-admin-card border border-emerald-500/20 bg-emerald-500/5"
      dir="rtl"
    >
      <audio ref={audioRef} src={src} preload="metadata" playsInline />
      <button
        type="button"
        onClick={() => void toggle()}
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all"
        aria-label={playing ? "إيقاف" : "تشغيل"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="mr-[-1px]" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1 h-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-emerald-400/70"
              style={{
                height: `${30 + ((i * 17) % 70)}%`,
                opacity: playing && i / 18 <= progress / 100 ? 1 : 0.45,
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
          <span className="inline-flex items-center gap-1 text-emerald-300/90">
            <Mic size={10} />
            رسالة صوتية
          </span>
          <span className="font-mono">{formatDuration(Math.floor(shown))}</span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-emerald-400/80 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function VoiceRecorderBar({
  durationSec,
  onCancel,
  onSend,
  isUploading,
}: {
  durationSec: number;
  onCancel: () => void;
  onSend: () => void;
  isUploading: boolean;
}) {
  const m = Math.floor(durationSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (durationSec % 60).toString().padStart(2, "0");

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 mx-1 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 lamma-popover-shell border border-red-500/30 bg-black/90 z-50"
      dir="rtl"
    >
      <div className="flex items-center gap-2 text-red-400 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs font-black">جاري التسجيل…</span>
        <span className="text-[11px] font-mono text-gray-300">
          {m}:{s}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isUploading}
          className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-white/5 text-gray-300 hover:bg-white/10"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={isUploading || durationSec < 1}
          className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {isUploading ? "جاري الإرسال…" : "إرسال 🎙️"}
        </button>
      </div>
    </div>
  );
}
