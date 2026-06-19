let audioCtx: AudioContext | null = null;
let primed = false;
let lastSoundAt = 0;
const SOUND_THROTTLE_MS = 1200;

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

function playOscillatorBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(880, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.16);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.3);
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

export async function playMessageAlertSound(): Promise<void> {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_THROTTLE_MS) return;
  lastSoundAt = now;

  try {
    await resumeAudioContext();
    playOscillatorBeep();
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
  if (!document.hidden) return;

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
