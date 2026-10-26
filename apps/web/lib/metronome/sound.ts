import type { Meter } from "chartdown";

/** The metronome's sound and its beat line, chosen on each device and kept there (R-11.7, R-11.8). */
export interface SoundSettings {
  /** The click, off by default: the pulse is the metronome, the sound is a choice. */
  click: boolean;
  /** The beat's fader, 0 to 100 (R-11.17): the volume saved before it took its place. */
  beat: number;
  /**
   * The eighths' fader, 0 to 100, or null until the person moves it: then it follows the meter,
   * at the beat's level in 6/8, 9/8 and 12/8, where every eighth sounded before, and 0 elsewhere.
   */
  eighths: number | null;
  /** The sixteenths' fader, 0 to 100. */
  sixteenths: number;
  /** One bar of clicks before the first bar. */
  countIn: boolean;
  /**
   * How the line along the playing bar moves (R-11.3, T-2816): in steps, a beat at a time, by
   * default, or smoothly from beat to beat.
   */
  beatLine: BeatLine;
  /**
   * A hum far below hearing while it plays, so speakers that sleep on silence (a display's,
   * Bluetooth) never cut a click (T-2820). On by default; off for studio monitors.
   */
  keepAwake: boolean;
}

export type BeatLine = "steps" | "smooth";

export const DEFAULT_SOUND: SoundSettings = {
  click: false,
  beat: 70,
  eighths: null,
  sixteenths: 0,
  countIn: false,
  beatLine: "steps",
  keepAwake: true,
};

const KEY = "cd-metronome";
const CHANGED = "cd-metronome-change";

let cached: { raw: string | null; value: SoundSettings } = { raw: null, value: DEFAULT_SOUND };

/** Saved settings read back, each one checked; anything unknown falls back to its default. */
export function parseSound(raw: string | null): SoundSettings {
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<SoundSettings> & { volume?: unknown }) : {};
    return {
      click: saved.click === true,
      beat: level(saved.beat) ?? level(saved.volume) ?? 70,
      eighths: level(saved.eighths) ?? null,
      sixteenths: level(saved.sixteenths) ?? 0,
      countIn: saved.countIn === true,
      beatLine: saved.beatLine === "smooth" ? "smooth" : "steps",
      keepAwake: saved.keepAwake !== false,
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

/** A fader's saved level, kept within 0 to 100; undefined when it isn't a number. */
const level = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : undefined;

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

/**
 * How a click sounds: beat 1, the start of a group of three in 6/8 or 12/8, any other beat, or a
 * subdivision between beats (R-11.17).
 */
export type ClickLevel = "accent" | "group" | "beat" | "split";

/**
 * One click's tone (R-11.7): higher and louder on beat 1; in 6/8, 9/8 and 12/8 the first eighth
 * of each group of three a step under it, so the groups are heard; softer on the others. A
 * subdivision is a lighter sound of its own, higher and quieter, never heard as a beat (R-11.17).
 */
export function clickTone(level: ClickLevel, volume: number): { frequency: number; peak: number } {
  const tone = {
    accent: { frequency: 1600, share: 1 },
    group: { frequency: 1300, share: 0.8 },
    beat: { frequency: 1000, share: 0.55 },
    split: { frequency: 2200, share: 0.4 },
  }[level];
  return { frequency: tone.frequency, peak: (volume / 100) * tone.share };
}

/** 6/8, 9/8 and 12/8: the metronome clicks every eighth and the beat is the group of three. */
export const isCompound = (meter: Meter) =>
  meter.unit === 8 && meter.beats > 3 && meter.beats % 3 === 0;

/** The three faders' levels for a meter, Eighths resolved while never moved (R-11.17). */
export function faders(sound: SoundSettings, meter: Meter) {
  return {
    beat: sound.beat,
    eighths: sound.eighths ?? (isCompound(meter) ? sound.beat : 0),
    sixteenths: sound.sixteenths,
  };
}

/** One sound of a click and its subdivisions: seconds after the click, its tone and its level. */
export interface ClickSound {
  offset: number;
  level: ClickLevel;
  volume: number;
}

/**
 * What one click of the metronome sounds (R-11.17), from its place in the bar and its length. In
 * 6/8, 9/8 and 12/8 each click is an eighth: the group's first is the beat's, the other two are
 * the eighths', and each is split in two by a sixteenth. Elsewhere each click is a beat, split in
 * two by Eighths and each half in two again by Sixteenths. A fader at 0 sounds nothing, and the
 * last beat of a fermata's bar sounds alone, as it holds.
 */
export function clickSounds(
  click: { accent: boolean; group?: true; duration: number; waits?: true },
  meter: Meter,
  sound: SoundSettings,
): ClickSound[] {
  const { beat, eighths, sixteenths } = faders(sound, meter);
  const onBeat = click.accent || click.group === true;
  const level: ClickLevel = click.accent ? "accent" : click.group ? "group" : "beat";
  const out: ClickSound[] = [];
  const add = (offset: number, at: ClickLevel, volume: number) => {
    if (volume > 0) out.push({ offset, level: at, volume });
  };
  const length = click.duration;
  if (isCompound(meter)) {
    add(0, level, onBeat ? beat : eighths);
    if (!click.waits) add(length / 2, "split", sixteenths);
    return out;
  }
  add(0, level, beat);
  if (click.waits) return out;
  add(length / 4, "split", sixteenths);
  add(length / 2, "split", eighths);
  add((3 * length) / 4, "split", sixteenths);
  return out;
}

/** How long a click lasts, and how fast it rises: 2 ms, so it has no pop. */
const CLICK_SECONDS = 0.05;
const RISE_SECONDS = 0.002;

/**
 * One click drawn once as samples (T-2820): a tone that rises in 2 ms and fades out over 50 ms,
 * at full scale. Every click then plays the same samples, so no click depends on how a browser
 * draws a volume curve on the spot, which Safari draws unevenly.
 */
export function clickSamples(sampleRate: number, frequency: number): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.round(sampleRate * CLICK_SECONDS));
  const rise = sampleRate * RISE_SECONDS;
  for (let at = 0; at < samples.length; at++) {
    const fade = Math.pow(0.0001, Math.max(0, at - rise) / (samples.length - rise));
    const envelope = at < rise ? at / rise : fade;
    samples[at] = envelope * Math.sin((2 * Math.PI * frequency * at) / sampleRate);
  }
  return samples;
}

const drawn = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();

function clickBuffer(audio: AudioContext, frequency: number): AudioBuffer {
  const mine = drawn.get(audio) ?? new Map<number, AudioBuffer>();
  drawn.set(audio, mine);
  let buffer = mine.get(frequency);
  if (!buffer) {
    const samples = clickSamples(audio.sampleRate, frequency);
    buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
    buffer.copyToChannel(samples, 0);
    mine.set(frequency, buffer);
  }
  return buffer;
}

/** Plays one click at a time on the audio clock, from its drawn samples at a steady volume. */
export function playClick(
  audio: AudioContext,
  at: number,
  level: ClickLevel,
  volume: number,
): void {
  const { frequency, peak } = clickTone(level, volume);
  if (peak <= 0) return;
  const click = audio.createBufferSource();
  click.buffer = clickBuffer(audio, frequency);
  const gain = audio.createGain();
  gain.gain.value = peak;
  click.connect(gain).connect(audio.destination);
  click.start(at);
}

/**
 * Keeps the speakers awake while the metronome plays (T-2820): between clicks the page would send
 * pure silence, and Bluetooth headphones, a display's speakers or an audio interface go to sleep
 * on it and cut the next click, some clicks and not others. A low hum far below hearing (40 Hz at
 * 1/2000 of full scale, about -66 dB) keeps them on. Returns what stops it.
 */
export function keepSpeakersAwake(audio: AudioContext): () => void {
  const hum = audio.createOscillator();
  const gain = audio.createGain();
  hum.frequency.value = AWAKE_HZ;
  gain.gain.value = AWAKE_LEVEL;
  hum.connect(gain).connect(audio.destination);
  hum.start();
  return () => {
    hum.stop();
    hum.disconnect();
    gain.disconnect();
  };
}

export const AWAKE_HZ = 40;
export const AWAKE_LEVEL = 0.0005;

/**
 * The device's silent mode is respected (R-11.7): on Safari the page's audio session is
 * "ambient", which the ring/silent switch mutes, never "playback", which would ignore it.
 */
export function respectSilentMode(): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "ambient";
}
