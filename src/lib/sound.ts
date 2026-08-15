const SOUND_KEY = 'fms-notification-sound';

export function isNotificationSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== '0';
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

export function unlockAudio(): void {
  getAudioContext();
}

export function playNotificationSound(): void {
  if (!isNotificationSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    const playTone = (start: number, frequency: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    playTone(now, 880, 0.18);
    playTone(now + 0.22, 1174.66, 0.3);
  } catch {
    // Audio unavailable — silent fallback
  }
}