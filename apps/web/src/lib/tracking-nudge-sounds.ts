let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

function playTone(frequency: number, durationMs: number, volume = 0.12): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

export function playIdleNudgeSound(): void {
  playTone(440, 120);
  window.setTimeout(() => playTone(330, 140), 160);
}

export function playCheckInNudgeSound(): void {
  playTone(523, 100);
  window.setTimeout(() => playTone(659, 100), 120);
  window.setTimeout(() => playTone(784, 140), 240);
}
