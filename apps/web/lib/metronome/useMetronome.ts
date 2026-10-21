import type { Chart } from "chartdown";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { audioClock, clicks, continueWith, Metronome, sectionEnd, type Click } from "./engine";
import {
  DEFAULT_SOUND,
  getSound,
  keepSpeakersAwake,
  playClick,
  respectSilentMode,
  saveSound,
  subscribeSound,
} from "./sound";
import { timeline, type TimelineBar } from "./timeline";
import { keepAwake } from "./wakeLock";

/** Where the metronome is: the click it reached and its bar in the timeline (none in count-in). */
export interface MetronomePosition {
  click: Click;
  bar?: TimelineBar;
}

/**
 * The metronome for a chart, on this device (R-11.14): Play from a bar of the timeline, Stop,
 * and the position the audio clock has reached, read once per frame for the pulse (R-11.3).
 * The AudioContext is created by the tap on Play, as browsers ask.
 */
/** How long Play waits at most for the audio clock to wake before counting anyway. */
const WAKE_WAIT_MS = 500;

export function useMetronome(chart: Chart) {
  const bars = useMemo(() => timeline(chart), [chart]);
  const needsTempo = bars.some((bar) => bar.tempo === undefined);
  const [position, setPosition] = useState<MetronomePosition | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  // Holding on a fermata until a tap (R-11.6).
  const [isWaiting, setWaiting] = useState(false);
  const engine = useRef<Metronome | null>(null);
  const context = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  // The screen stays on while it plays (R-11.11).
  const awake = useRef<(() => void) | null>(null);
  // The low hum that keeps the speakers from sleeping between clicks (T-2820), while it plays.
  const humming = useRef<(() => void) | null>(null);
  // The click, its volume and the count-in, kept on this device (R-11.7, R-11.8). The scheduler
  // reads the latest, so turning the click on while playing is heard on the next beat.
  const sound = useSyncExternalStore(subscribeSound, getSound, () => DEFAULT_SOUND);
  const heard = useRef(sound);
  useEffect(() => {
    heard.current = sound;
  }, [sound]);
  // The beat line's motion (T-2816) is drawn by the chart's styles from the page's choice.
  useEffect(() => {
    document.documentElement.dataset.beatLine = sound.beatLine;
  }, [sound.beatLine]);
  // The tempo asked of the person and the practice speed, kept for what is queued later.
  const asked = useRef<{ tempo?: number; speed?: number }>({});
  // The section queued after the one that sounds (R-11.15), and the click it starts on.
  const [queued, setQueued] = useState<number | null>(null);
  const queuedAt = useRef(-1);

  const stop = useCallback(() => {
    awake.current?.();
    awake.current = null;
    humming.current?.();
    humming.current = null;
    engine.current?.stop();
    engine.current = null;
    cancelAnimationFrame(frame.current);
    setPosition(null);
    setPlaying(false);
    setWaiting(false);
    setQueued(null);
    queuedAt.current = -1;
  }, []);

  const play = useCallback(
    (from: number, options: { tempo?: number; speed?: number; countIn?: boolean } = {}) => {
      stop();
      asked.current = {
        ...(options.tempo !== undefined ? { tempo: options.tempo } : {}),
        ...(options.speed !== undefined ? { speed: options.speed } : {}),
      };
      respectSilentMode();
      const audio = (context.current ??= new AudioContext());
      // Asked for inside the tap, as Safari requires; the count waits for it below.
      const waking = audio.state === "running" ? null : audio.resume();
      // On from Play, so the speakers are already awake for the first click.
      if (heard.current.click && heard.current.keepAwake)
        humming.current = keepSpeakersAwake(audio);
      const list = clicks(bars, { from, countIn: heard.current.countIn, ...options });
      const metronome = new Metronome(list, audioClock(audio), (click, at) => {
        if (heard.current.click) {
          const level = click.accent ? "accent" : click.group ? "group" : "beat";
          playClick(audio, at, level, heard.current.volume);
        }
      });
      engine.current = metronome;
      awake.current = keepAwake();
      setPlaying(true);
      let shown: Click | undefined;
      const tick = () => {
        if (engine.current !== metronome) return;
        if (!metronome.isPlaying) return stop();
        const click = metronome.position();
        setWaiting(metronome.isWaiting);
        // The queued section has begun: nothing waits any more.
        if (queuedAt.current >= 0 && metronome.index() >= queuedAt.current) {
          queuedAt.current = -1;
          setQueued(null);
        }
        if (click && click !== shown) {
          shown = click;
          const bar = bars[click.bar];
          setPosition(bar ? { click, bar } : { click });
        }
        frame.current = requestAnimationFrame(tick);
      };
      // The first click is timed once the audio clock runs (T-2817): a clock still waking up
      // (Safari, Bluetooth headphones) would bunch the first clicks together, then jump. A clock
      // that never wakes (no tap to allow sound) still lets the pulse play, silently.
      let begun = false;
      const begin = () => {
        if (begun || engine.current !== metronome) return;
        begun = true;
        metronome.start();
        frame.current = requestAnimationFrame(tick);
      };
      if (!waking) begin();
      else {
        void waking.then(begin, begin);
        setTimeout(begin, WAKE_WAIT_MS);
      }
    },
    [bars, stop],
  );

  // Leaving the page stops it and lets the audio go.
  useEffect(
    () => () => {
      awake.current?.();
      humming.current?.();
      engine.current?.stop();
      cancelAnimationFrame(frame.current);
      void context.current?.close();
    },
    [],
  );

  // The hum is only for a click that sounds: turning the click or Keep speakers awake on or off
  // while it plays takes effect at once.
  const wantsHum = sound.click && sound.keepAwake;
  useEffect(() => {
    const audio = context.current;
    if (!isPlaying || !audio) return;
    if (wantsHum && !humming.current) humming.current = keepSpeakersAwake(audio);
    if (!wantsHum && humming.current) {
      humming.current();
      humming.current = null;
    }
  }, [isPlaying, wantsHum]);

  /** The first bar of a section in the play order, to start there. */
  const firstBarOf = useCallback(
    (section: number) =>
      Math.max(
        0,
        bars.findIndex((bar) => bar.section === section),
      ),
    [bars],
  );

  /**
   * Queues a section after the one that sounds (R-11.15): the same section repeats it, and the
   * section already queued cancels the queue, so the song goes on as written.
   */
  const queue = useCallback(
    (section: number) => {
      const metronome = engine.current;
      if (!metronome) return;
      const playing = Math.max(metronome.index(), 0);
      const tempo = asked.current;
      let tail: Click[];
      if (queued === section) {
        const end = sectionEnd(metronome.clicks, bars, playing);
        const after = (metronome.clicks[end - 1]?.bar ?? -1) + 1;
        tail = after < bars.length ? clicks(bars, { from: after, ...tempo }) : [];
      } else tail = clicks(bars, { from: firstBarOf(section), ...tempo });
      const next = continueWith(metronome.clicks, bars, playing, tail, metronome.scheduled);
      metronome.replace(next.list);
      const cancel = queued === section;
      queuedAt.current = cancel ? -1 : next.at;
      setQueued(cancel ? null : section);
    },
    [bars, firstBarOf, queued],
  );

  /** Goes on after a fermata (R-11.6). */
  const resume = useCallback(() => engine.current?.resume(), []);

  return {
    bars,
    needsTempo,
    position,
    isPlaying,
    isWaiting,
    play,
    stop,
    resume,
    firstBarOf,
    queue,
    queued,
    sound,
    setSound: saveSound,
  };
}
