import type { Chart } from "chartdown";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audioClock, clicks, Metronome, type Click } from "./engine";
import { timeline, type TimelineBar } from "./timeline";

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
export function useMetronome(chart: Chart) {
  const bars = useMemo(() => timeline(chart), [chart]);
  const needsTempo = bars.some((bar) => bar.tempo === undefined);
  const [position, setPosition] = useState<MetronomePosition | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const engine = useRef<Metronome | null>(null);
  const context = useRef<AudioContext | null>(null);
  const frame = useRef(0);

  const stop = useCallback(() => {
    engine.current?.stop();
    engine.current = null;
    cancelAnimationFrame(frame.current);
    setPosition(null);
    setPlaying(false);
  }, []);

  const play = useCallback(
    (from: number, options: { tempo?: number; countIn?: boolean } = {}) => {
      stop();
      const audio = (context.current ??= new AudioContext());
      void audio.resume();
      const list = clicks(bars, { from, ...options });
      const metronome = new Metronome(list, audioClock(audio));
      engine.current = metronome;
      metronome.start();
      setPlaying(true);
      let shown: Click | undefined;
      const tick = () => {
        if (engine.current !== metronome) return;
        if (!metronome.isPlaying) return stop();
        const click = metronome.position();
        if (click && click !== shown) {
          shown = click;
          const bar = bars[click.bar];
          setPosition(bar ? { click, bar } : { click });
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [bars, stop],
  );

  // Leaving the page stops it and lets the audio go.
  useEffect(
    () => () => {
      engine.current?.stop();
      cancelAnimationFrame(frame.current);
      void context.current?.close();
    },
    [],
  );

  /** The first bar of a section in the play order, to start there. */
  const firstBarOf = useCallback(
    (section: number) =>
      Math.max(
        0,
        bars.findIndex((bar) => bar.section === section),
      ),
    [bars],
  );

  return { bars, needsTempo, position, isPlaying, play, stop, firstBarOf };
}
