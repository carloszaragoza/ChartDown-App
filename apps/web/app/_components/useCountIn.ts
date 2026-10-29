"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSound, playClick } from "../../lib/metronome/sound";
import type { CountIn } from "../../lib/video/countIn";

/** What the count needs of a player: the video's or the band's audio. */
export interface CountedPlayer {
  /** Seconds into the recording. */
  time(): number;
  seek(to: number): void;
  play(): void;
  pause(): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  /**
   * The player's own audio graph, when the recording plays through it: the clicks then sound in
   * it too, and silencing turns its gain down, so it keeps playing. An iPhone pauses a recording
   * unmuted without a tap and interrupts a second audio context (T-3023).
   */
  context?: AudioContext;
}

const KEY = "chartdown:count-in";
const CHANGED = "chartdown:count-in-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};
// On unless turned off on this device; storage can be missing or blocked.
const read = () => {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};

// A moment for the first click to be scheduled ahead of the audio clock.
const AHEAD = 0.05;
// The recording runs this close to its bar before it is heard, so the first beat is never cut.
const EARLY = 0.02;
const GIVE_UP_MS = 4000;

/**
 * The count-in before the video or the band's audio (R-03.14, T-3023): one bar of the metronome's
 * clicks at the chart's tempo, then the recording starts on the bar. When there is a bar of the
 * recording before it, the recording plays silent under the count and the clicks follow its own
 * clock, so it starts in time, and a phone lets it sound since it began from the tap. Each count
 * has its own audio context, closed when it ends or is stopped, which silences any click left.
 */
export function useCountIn() {
  const isOn = useSyncExternalStore(subscribe, read, () => true);
  const setOn = useCallback((on: boolean) => {
    try {
      window.localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
      // Without storage it lasts until the page closes.
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  // The beat being counted, "2 / 4", while it counts.
  const [beat, setBeat] = useState<{ count: number; of: number } | null>(null);
  const [isCounting, setCounting] = useState(false);
  const running = useRef<(() => void) | null>(null);
  // Read by the player's seek, which a chosen section or bar calls outside a render.
  const counting = useRef(false);
  useEffect(() => {
    counting.current = isCounting;
  }, [isCounting]);

  const stop = useCallback(() => {
    running.current?.();
    running.current = null;
    setBeat(null);
    setCounting(false);
  }, []);
  useEffect(() => stop, [stop]);

  /** Counts, then plays from the bar; called from the tap on Play. */
  const start = useCallback(
    (plan: CountIn, player: CountedPlayer) => {
      stop();
      setCounting(true);
      const own = !player.context;
      const audio = player.context ?? new AudioContext();
      void audio.resume();
      const volume = getSound().beat;
      const wasMuted = player.isMuted();
      const lead = plan.at - plan.length;
      let frame = 0;
      let timer = 0;
      // Audio-clock time of the count's first click, once known.
      let first: number | null = null;
      const schedule = (at: number) => {
        first = at;
        for (const click of plan.clicks)
          playClick(
            audio,
            Math.max(at + click.time, audio.currentTime),
            click.accent ? "accent" : "beat",
            volume,
          );
      };
      const done = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(timer);
        if (own) window.setTimeout(() => void audio.close(), 500);
        running.current = null;
        setBeat(null);
        setCounting(false);
      };
      const show = () => {
        if (first === null) return;
        const into = audio.currentTime - first;
        const click = [...plan.clicks].reverse().find((each) => each.time <= into);
        setBeat(click ? { count: click.count, of: click.of } : null);
      };
      if (lead >= 0) {
        // Silent from a bar before; the clicks follow the recording's own clock.
        player.setMuted(true);
        player.seek(lead);
        player.play();
        const began = performance.now();
        const follow = () => {
          const time = player.time();
          // A recording that never starts (still loading, or not allowed): it plays as it can.
          if (first === null && performance.now() - began > GIVE_UP_MS) {
            if (!wasMuted) player.setMuted(false);
            return done();
          }
          if (first === null && time > lead + EARLY) schedule(audio.currentTime - (time - lead));
          show();
          if (first !== null && time >= plan.at - EARLY) {
            if (!wasMuted) player.setMuted(false);
            return done();
          }
          frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);
      } else {
        // Too near the recording's start for a silent bar: it starts when the count ends.
        schedule(audio.currentTime + AHEAD);
        const tick = () => {
          show();
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        if (player.context) {
          // Through its own graph it plays silent from the tap, as a phone needs, and moves to
          // the bar when the count ends.
          player.setMuted(true);
          player.play();
        } else {
          // Moved there only now: YouTube starts a video it hasn't played yet when it is moved.
          player.pause();
        }
        timer = window.setTimeout(
          () => {
            player.seek(plan.at);
            if (player.context) {
              if (!wasMuted) player.setMuted(false);
            } else player.play();
            done();
          },
          (AHEAD + plan.length) * 1000,
        );
      }
      running.current = () => {
        done();
        player.pause();
        if (!wasMuted) player.setMuted(false);
      };
    },
    [stop],
  );

  return { isOn, setOn, beat, isCounting, counting, start, stop };
}
