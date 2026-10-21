/** The metronome's sound and its beat line, chosen on each device and kept there (R-11.7, R-11.8). */
export interface SoundSettings {
  /** The click, off by default: the pulse is the metronome, the sound is a choice. */
  click: boolean;
  /** 0 to 100. */
  volume: number;
  /** One bar of clicks before the first bar. */
  countIn: boolean;
  /**
   * How the line along the playing bar moves (R-11.3, T-2816): in steps, a beat at a time, by
   * default, or smoothly from beat to beat.
   */
  beatLine: BeatLine;
}

export type BeatLine = "steps" | "smooth";

export const DEFAULT_SOUND: SoundSettings = {
  click: false,
  volume: 70,
  countIn: false,
  beatLine: "steps",
};

const KEY = "cd-metronome";
const CHANGED = "cd-metronome-change";

let cached: { raw: string | null; value: SoundSettings } = { raw: null, value: DEFAULT_SOUND };

/** Saved settings read back, each one checked; anything unknown falls back to its default. */
export function parseSound(raw: string | null): SoundSettings {
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<SoundSettings>) : {};
    return {
      click: saved.click === true,
      volume: typeof saved.volume === "number" ? Math.min(100, Math.max(0, saved.volume)) : 70,
      countIn: saved.countIn === true,
      beatLine: saved.beatLine === "smooth" ? "smooth" : "steps",
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

function read(raw: string | null): SoundSettings {
  if (raw === cached.raw) return cached.value;
  const value = parseSound(raw);
  cached = { raw, value };
  return value;
}

/** The settings on this device; the defaults when storage is empty or blocked. */
export function getSound(): SoundSettings {
  try {
    return read(window.localStorage.getItem(KEY));
  } catch {
    return DEFAULT_SOUND;
  }
}

export function saveSound(settings: SoundSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked (a private window): the choice lasts until the page closes.
    cached = { raw: JSON.stringify(settings), value: settings };
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function subscribeSound(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** One click's tone: higher and louder on beat 1, softer on the others (R-11.7). */
export function clickTone(accent: boolean, volume: number): { frequency: number; peak: number } {
  return { frequency: accent ? 1600 : 1000, peak: (volume / 100) * (accent ? 1 : 0.55) };
}

/** Plays one click at a time on the audio clock: a short tone, 50 ms, with no pop. */
export function playClick(audio: AudioContext, at: number, accent: boolean, volume: number): void {
  const { frequency, peak } = clickTone(accent, volume);
  if (peak <= 0) return;
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  tone.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  tone.connect(gain).connect(audio.destination);
  tone.start(at);
  tone.stop(at + 0.06);
}

/**
 * The device's silent mode is respected (R-11.7): on Safari the page's audio session is
 * "ambient", which the ring/silent switch mutes, never "playback", which would ignore it.
 */
export function respectSilentMode(): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "ambient";
}
