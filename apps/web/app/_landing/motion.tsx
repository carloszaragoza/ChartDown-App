"use client";

import {
  AnimatePresence,
  motion,
  MotionConfig,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarsView } from "./BarsView";
import type { DemoBar, DemoSection } from "./bars";
import styles from "./landing.module.css";

/*
 * The landing's motion (T-1310, design handoff: Landing version 3, inspired by jozue.fr). Each
 * piece animates only on screen and once where it tells a story; with the system's reduced-motion
 * setting every piece shows its final state and nothing moves (MotionConfig "user" for the
 * transitions, and an explicit still path for what follows the scroll).
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The props that reveal a piece once it is on screen, or, with reduced motion, show its final
 * state from the start.
 */
function reveal(still: boolean | null, amount = 0.25) {
  return still
    ? ({ initial: false, animate: "shown" } as const)
    : ({ initial: "hidden", whileInView: "shown", viewport: { once: true, amount } } as const);
}

/** The landing's motion settings: the system's reduced-motion choice wins. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Rises and fades in once it comes on screen. */
export function Rise({
  children,
  delay = 0,
  scale = false,
  className,
}: {
  children: ReactNode;
  delay?: number;
  /** Grows a little as it rises, for a panel. */
  scale?: boolean;
  className?: string | undefined;
}) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      {...reveal(still)}
      variants={{
        hidden: { opacity: 0, y: 40, ...(scale ? { scale: 0.94 } : {}) },
        shown: { opacity: 1, y: 0, scale: 1 },
      }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A headline whose words rise one by one from behind a mask. The headline itself is watched,
 * since a word waiting behind its mask is never on screen.
 */
export function Words({ text, accent }: { text: string; accent?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const still = useReducedMotion();
  const all = [
    ...text.split(" ").map((word) => ({ word, red: false })),
    ...(accent ? accent.split(" ").map((word) => ({ word, red: true })) : []),
  ];
  return (
    <span ref={ref}>
      {all.map(({ word, red }, index) => (
        <span key={index}>
          <span className={styles.mask}>
            <motion.span
              className={red ? styles.accent : undefined}
              style={{ display: "inline-block" }}
              initial={still ? false : { y: "110%" }}
              animate={{ y: inView || still ? "0%" : "110%" }}
              transition={{ duration: 0.8, delay: index * 0.06, ease: EASE }}
            >
              {word}
            </motion.span>
          </span>
          {index < all.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** The chart window lies back and stands up as it scrolls in. */
export function TiltWindow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  return (
    <div ref={ref} className={styles.tiltStage}>
      <motion.div style={still ? {} : { rotateX, scale }} className={styles.tilt}>
        {children}
      </motion.div>
    </div>
  );
}

/** Two rows of the app's words, sliding opposite ways as the page scrolls. */
export function Marquee({ words }: { words: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const left = useTransform(scrollYProgress, [0, 1], ["0%", "-28%"]);
  const right = useTransform(scrollYProgress, [0, 1], ["-28%", "0%"]);
  const row = (x: MotionValue<string>, outline: boolean) => (
    <motion.div
      className={outline ? `${styles.marqueeRow} ${styles.marqueeOutline}` : styles.marqueeRow}
      style={still ? {} : { x }}
    >
      {[0, 1, 2].flatMap((copy) =>
        words.map((word, index) => (
          <span key={`${copy}-${index}`} className={styles.marqueeWord}>
            {word}
            <span className={styles.marqueeSlash}>/</span>
          </span>
        )),
      )}
    </motion.div>
  );
  return (
    <div ref={ref} className={styles.marquee} aria-hidden="true">
      {row(left, false)}
      {row(right, true)}
    </div>
  );
}

/** The band chat: its messages arrive one by one, as they did that night. */
export function Chat({
  items,
  className,
  label,
}: {
  items: { side: "in" | "out"; node: ReactNode }[];
  className: string | undefined;
  label: string;
}) {
  return (
    <motion.div
      className={className}
      role="group"
      aria-label={label}
      {...reveal(useReducedMotion(), 0.35)}
      variants={{ shown: { transition: { staggerChildren: 0.42, delayChildren: 0.2 } } }}
    >
      {items.map((item, index) =>
        index === 0 ? (
          <div key={index}>{item.node}</div>
        ) : (
          <motion.div
            key={index}
            className={item.side === "out" ? styles.out : styles.in}
            variants={{
              hidden: { opacity: 0, y: 14, scale: 0.94 },
              shown: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 420, damping: 30 },
              },
            }}
          >
            {item.node}
          </motion.div>
        ),
      )}
    </motion.div>
  );
}

/** A large figure that drifts slower than the page behind a feature. */
export function Drift({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  return (
    <motion.div ref={ref} className={styles.drift} style={still ? {} : { y }} aria-hidden="true">
      {children}
    </motion.div>
  );
}

/** Repeats a step while on screen, never with reduced motion. */
function useCycle(length: number, every: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const still = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!inView || still || length < 2) return;
    const timer = setInterval(() => setIndex((now) => (now + 1) % length), every);
    return () => clearInterval(timer);
  }, [inView, still, length, every]);
  return { ref, index };
}

/** Numbers stay; the letters turn to each key in turn, and the chart still works. */
export function KeyFlip({
  numbers,
  keys,
  words,
}: {
  numbers: DemoBar[];
  keys: { key: string; label: string; bars: DemoBar[] }[];
  words: { numbers: string; letters: string; label: string };
}) {
  const { ref, index } = useCycle(keys.length, 2600);
  const shown = keys[index] ?? keys[0];
  return (
    <div ref={ref} className={styles.flipStack} role="img" aria-label={words.label}>
      <div className={styles.panel}>
        <span className={styles.segmentedStill}>
          <span className={styles.segmentOn}>{words.numbers}</span>
          <span>{words.letters}</span>
        </span>
        <BarsView bars={numbers} size="md" />
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <span className={styles.segmentedStill}>
            <span>{words.numbers}</span>
            <span className={styles.segmentOn}>{words.letters}</span>
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={shown?.key}
              className={styles.chip}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {shown?.label}
            </motion.span>
          </AnimatePresence>
        </div>
        <BarsView bars={shown?.bars ?? []} size="md" flipKey={shown?.key} />
      </div>
    </div>
  );
}

/** The director's note writes itself in, left to right, once its line is on screen. */
export function WriteIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const still = useReducedMotion();
  return (
    <span ref={ref}>
      <motion.span
        className={styles.writeIn}
        initial={still ? false : { clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: inView || still ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
        transition={{ duration: 1.1, delay, ease: [0.65, 0, 0.35, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Stand mode on the iPad: it turns from section to section, with the beat line under the bars. */
export function StandCycle({ title, sections }: { title: string; sections: DemoSection[] }) {
  const { ref, index } = useCycle(sections.length, 3200);
  const shown = sections[index] ?? sections[0];
  return (
    <div ref={ref} className={styles.ipadScreen}>
      <div className={styles.ipadTop}>
        <span className={styles.ipadTitle}>{title}</span>
        <span className={styles.pills}>
          {sections.map((section, at) => (
            <span key={section.short} className={styles.pill}>
              {at === index && (
                <motion.span
                  layoutId="stand-pill"
                  className={styles.pillOn}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className={styles.pillText} data-on={at === index}>
                {section.short}
              </span>
            </span>
          ))}
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={shown?.short}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <BarsView bars={shown?.bars ?? []} size="xl" columns={2} pulse />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The dark band opens from an inset card to the full width as it scrolls in. */
export function DarkBand({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className: string | undefined;
  id: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.2"] });
  const clipPath = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(0% 6% 0% 6% round 40px)", "inset(0% 0% 0% 0% round 0px)"],
  );
  return (
    <motion.section ref={ref} id={id} className={className} style={still ? {} : { clipPath }}>
      {children}
    </motion.section>
  );
}

/** ChartDown typing itself in, line by line. */
export function TypeLines({
  lines,
  label,
}: {
  lines: { text: string; tone: "meta" | "section" | "note" | "bars" | "blank" }[];
  label: string;
}) {
  return (
    <motion.pre
      className={styles.code}
      aria-label={label}
      {...reveal(useReducedMotion(), 0.4)}
      variants={{ shown: { transition: { staggerChildren: 0.16 } } }}
    >
      <code>
        {lines.map((line, index) => (
          <motion.span
            key={index}
            className={styles[`code_${line.tone}`]}
            variants={{
              hidden: { clipPath: "inset(0 100% 0 0)" },
              shown: { clipPath: "inset(0 0% 0 0)", transition: { duration: 0.5, ease: "linear" } },
            }}
          >
            {line.text || " "}
          </motion.span>
        ))}
      </code>
    </motion.pre>
  );
}

function ReadWord({
  word,
  progress,
  at,
  of,
}: {
  word: string;
  progress: MotionValue<number>;
  at: number;
  of: number;
}) {
  const opacity = useTransform(progress, [at / of, (at + 1) / of], [0.16, 1]);
  return <motion.span style={{ opacity }}>{word} </motion.span>;
}

/** The founder's words light up as they are read. */
export function ReadQuote({ text }: { text: string }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = text.split(" ");
  return (
    <blockquote ref={ref} className={styles.quote}>
      {still
        ? text
        : words.map((word, index) => (
            <ReadWord
              key={index}
              word={word}
              progress={scrollYProgress}
              at={index}
              of={words.length}
            />
          ))}
    </blockquote>
  );
}

/** A button that leans toward the pointer, only where there is a fine pointer. */
export function Magnetic({ children }: { children: ReactNode }) {
  const still = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });
  return (
    <motion.span
      className={styles.magnetic}
      style={still ? {} : { x: springX, y: springY }}
      onPointerMove={(event) => {
        if (still || event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - box.left - box.width / 2) * 0.22);
        y.set((event.clientY - box.top - box.height / 2) * 0.3);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
