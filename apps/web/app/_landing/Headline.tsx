"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./landing.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;
// The opening curtain and the first rise take about this long; the first change waits for them.
const FIRST_CHANGE = 4200;
const EVERY = 3500;

export interface HeadlinePair {
  who: string;
  when: string;
}

/** The pairs after the first, in a new order each visit. */
function shuffled(count: number): number[] {
  const order = Array.from({ length: count - 1 }, (_, index) => index + 1);
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [order[index], order[other]] = [order[other] as number, order[index] as number];
  }
  return order;
}

/** One changing part of the headline: it rises from its mask, the old one leaving upward. */
function Slot({
  text,
  first,
  delay,
  className,
}: {
  text: string;
  first: boolean;
  delay: number;
  className?: string | undefined;
}) {
  return (
    <span className={styles.mask}>
      <AnimatePresence mode="wait" initial={false}>
        {first ? (
          <span
            key={text}
            className={`${styles.rise} ${className ?? ""}`}
            style={{ "--d": delay } as CSSProperties}
          >
            {text}
          </span>
        ) : (
          <motion.span
            key={text}
            className={className}
            style={{ display: "inline-block", ["--u-delay" as string]: "0.5s" }}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-110%" }}
            transition={{ duration: 0.55, delay: delay * 0.08, ease: EASE }}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * The hero's headline (owner's review, October 15, 2026): who plays, "Same page.", and when or
 * where, so each visitor meets their own band. It opens on the first pair, which is what search
 * engines, screen readers and reduced motion get; then the other pairs follow in a new order on
 * each visit, only while the headline is on screen.
 */
export function Headline({ pairs, same }: { pairs: HeadlinePair[]; same: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref);
  const still = useReducedMotion();
  const [at, setAt] = useState(0);
  // The order is drawn at the first change, so the server and the first render agree.
  const [order, setOrder] = useState<number[] | null>(null);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    if (still || !inView || pairs.length < 2) return;
    const timer = setTimeout(
      () => {
        setOrder((now) => now ?? shuffled(pairs.length));
        setMoved(true);
        setAt((now) => (now + 1) % pairs.length);
      },
      moved ? EVERY : FIRST_CHANGE,
    );
    return () => clearTimeout(timer);
  }, [still, inView, pairs.length, at, moved]);

  const shown = pairs[at === 0 || !order ? 0 : (order[at - 1] ?? 0)] ?? pairs[0];
  const first = pairs[0];
  if (!shown || !first) return null;
  return (
    <h1 ref={ref} className={styles.h1}>
      <span className={styles.srOnly}>{`${first.who} ${same} ${first.when}`}</span>
      {/* Every pair, unseen, in the same cell: the headline takes the tallest one's room, so the
          page below never jumps when it changes. */}
      {pairs.map((pair) => (
        <span key={pair.who} className={styles.headSizer} aria-hidden="true">
          <span className={styles.headLine}>{pair.who}</span>
          <span className={styles.headLine}>{same}</span>
          <span className={styles.headLine}>{pair.when}</span>
        </span>
      ))}
      <span className={styles.headShown} aria-hidden="true">
        <span className={styles.headLine}>
          <Slot text={shown.who} first={!moved} delay={0} />
        </span>
        <span className={styles.headLine}>
          <span className={styles.mask}>
            <span className={styles.rise} style={{ "--d": 1 } as CSSProperties}>
              {same}
            </span>
          </span>
        </span>
        <span className={styles.headLine}>
          <Slot
            text={shown.when}
            first={!moved}
            delay={2}
            className={`${styles.accent} ${styles.underline}`}
          />
        </span>
      </span>
    </h1>
  );
}
