"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import type { DemoBar, DemoChord } from "./bars";
import styles from "./landing.module.css";

function Chord({ chord }: { chord: DemoChord }) {
  return (
    <span className={styles.chord}>
      {chord.root}
      {chord.mark === "-" ? (
        <sup className={styles.minor}>-</sup>
      ) : (
        chord.mark && <span className={styles.quality}>{chord.mark}</span>
      )}
      {chord.bass && <span className={styles.bass}>/{chord.bass}</span>}
    </span>
  );
}

/**
 * A row of bars as the app draws them (T-1310): thick bar lines, the chords from the parser, a
 * dynamic and a lyric cue. With `flipKey`, the chords turn over when it changes; with `pulse`, the
 * metronome's beat line sweeps the bars one after another, as in stand mode (R-11.3).
 */
export function BarsView({
  bars,
  size,
  columns = 4,
  flipKey,
  pulse = false,
}: {
  bars: DemoBar[];
  size: "md" | "lg" | "xl";
  columns?: number;
  flipKey?: string | undefined;
  pulse?: boolean;
}) {
  return (
    <div
      className={`${styles.bars} ${styles[`bars_${size}`]} ${pulse ? styles.pulse : ""}`}
      style={{ "--cols": columns, "--count": bars.length } as CSSProperties}
      aria-hidden="true"
    >
      {bars.map((bar, index) => (
        <div key={index} className={styles.bar} style={{ "--i": index } as CSSProperties}>
          {bar.dynamic && <span className={styles.dynamic}>{bar.dynamic}</span>}
          <span className={styles.chords}>
            {flipKey === undefined ? (
              bar.chords.map((chord, at) => <Chord key={at} chord={chord} />)
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${flipKey}-${index}`}
                  className={styles.chords}
                  initial={{ rotateX: -90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: 90, opacity: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  {bar.chords.map((chord, at) => (
                    <Chord key={at} chord={chord} />
                  ))}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          {bar.lyric && <span className={styles.lyric}>“{bar.lyric}”</span>}
        </div>
      ))}
    </div>
  );
}
