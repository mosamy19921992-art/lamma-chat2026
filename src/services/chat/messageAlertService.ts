let audioCtx: AudioContext | null = null;
let primed = false;
let lastSoundAt = 0;
const SOUND_THROTTLE_MS = 900;
const PM_SOUND_THROTTLE_MS = 650;
const MESSAGE_SOUND_PREF_KEY = "lamma_message_sound_enabled";

export function isMessageAlertSoundEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    const stored = localStorage.getItem(MESSAGE_SOUND_PREF_KEY);
    if (stored === null) return true;
    return stored !== "0" && stored !== "false";
  } catch {
    return true;
  }
}

export function setMessageAlertSoundEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MESSAGE_SOUND_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

function getAudioContext(): AudioContext | null {
  const win = window as Window &
    typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
  const Ctx = win.AudioContext || win.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "suspended") return;
  try {
    await ctx.resume();
  } catch {
    // ignore
  }
}

function playTone(
  frequency: number,
  startAt: number,
  duration: number,
  volume = 0.14,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(frequency, startAt);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(startAt);
  o.stop(startAt + duration + 0.02);
}

function playOscillatorBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(880, t, 0.26, 0.14);
  playTone(620, t + 0.08, 0.22, 0.1);
}

function playPmOscillatorBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(988, t, 0.18, 0.16);
  playTone(1174, t + 0.14, 0.2, 0.14);
  playTone(880, t + 0.32, 0.24, 0.1);
}

function playFallbackBeep(): void {
  try {
    const el = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQQAAAAA",
    );
    el.volume = 0.45;
    void el.play().catch(() => {});
  } catch {
    // ignore
  }
}

/** يُستدعى مرة بعد أول تفاعل — يفتح الصوت على الموبايل */
export function primeMessageAlerts(): void {
  if (primed) return;
  primed = true;
  void resumeAudioContext();
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => {});
  }
}

export async function playMessageAlertSound(kind: "pm" | "default" = "default"): Promise<void> {
  if (!isMessageAlertSoundEnabled()) return;

  const now = Date.now();
  const throttle = kind === "pm" ? PM_SOUND_THROTTLE_MS : SOUND_THROTTLE_MS;
  if (now - lastSoundAt < throttle) return;
  lastSoundAt = now;

  try {
    await resumeAudioContext();
    if (kind === "pm") playPmOscillatorBeep();
    else playOscillatorBeep();
  } catch {
    playFallbackBeep();
  }
}

export function showBrowserMessageNotification(
  title: string,
  body: string,
): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body: body.slice(0, 180),
      tag: `lamma-msg-${Date.now()}`,
      silent: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    window.setTimeout(() => notification.close(), 8000);
  } catch {
    // ignore
  }
}

export function bindMessageAlertPriming(): () => void {
  const prime = () => {
    primeMessageAlerts();
  };
  window.addEventListener("pointerdown", prime, { once: true, passive: true });
  window.addEventListener("keydown", prime, { once: true });
  return () => {
    window.removeEventListener("pointerdown", prime);
    window.removeEventListener("keydown", prime);
  };
}
