/** Incoming-call ringtone via Web Audio (no external asset). */

let audioCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let activeOscillators: OscillatorNode[] = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioCtx = audioCtx ?? new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

function playRingBurst(ctx: AudioContext): void {
  const now = ctx.currentTime;
  for (const freq of [440, 480]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
    activeOscillators.push(osc);
    osc.onended = () => {
      activeOscillators = activeOscillators.filter((o) => o !== osc);
    };
  }
}

export async function startIncomingCallRingtone(): Promise<void> {
  stopIncomingCallRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    await ctx.resume();
  } catch {
    // may need user gesture first — visual alert still shows
  }

  playRingBurst(ctx);
  ringTimer = setInterval(() => {
    if (audioCtx) playRingBurst(audioCtx);
  }, 2200);
}

export function stopIncomingCallRingtone(): void {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  for (const osc of activeOscillators) {
    try {
      osc.stop();
    } catch {
      // already stopped
    }
  }
  activeOscillators = [];
}
