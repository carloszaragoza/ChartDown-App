// How stand mode's stack of sections moves (R-03.12, T-2803): the chosen section glides to the
// top of the stack, the active zone, with a short motion drawn frame by frame, or at once with
// reduced motion.

export type StandMotion = "calm" | "bounce";

/** Calm eases in and out; Soft bounce overshoots a little and settles. */
export const easings: Record<StandMotion, (t: number) => number> = {
  calm: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  bounce: (t) => {
    const c1 = 0.9;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

export const durations: Record<StandMotion, number> = { calm: 700, bounce: 820 };

/**
 * Where the stack must scroll to put a card's top in the active zone, `margin` pixels under the
 * stack's top, never past either end.
 */
export function stackTarget({
  cardTop,
  stackTop,
  scrollTop,
  maxScroll,
  margin,
}: {
  cardTop: number;
  stackTop: number;
  scrollTop: number;
  maxScroll: number;
  margin: number;
}): number {
  return Math.min(Math.max(cardTop - stackTop + scrollTop - margin, 0), Math.max(maxScroll, 0));
}

/** Of the cards' tops, the one nearest the active zone, as an index. */
export function nearestCard(tops: readonly number[], zone: number): number {
  let best = 0;
  for (let index = 1; index < tops.length; index += 1) {
    if (Math.abs((tops[index] ?? 0) - zone) < Math.abs((tops[best] ?? 0) - zone)) best = index;
  }
  return best;
}

/**
 * Glides the stack to a scroll position; snapping is off while it moves and comes back just after
 * it lands. Returns a function that stops it.
 */
export function glide(
  stack: HTMLElement,
  to: number,
  { motion, instant, onDone }: { motion: StandMotion; instant: boolean; onDone: () => void },
): () => void {
  const from = stack.scrollTop;
  if (instant || Math.abs(to - from) < 2) {
    stack.scrollTop = to;
    onDone();
    return () => {};
  }
  const ease = easings[motion];
  const duration = durations[motion];
  stack.style.scrollSnapType = "none";
  let frame = 0;
  let timer = 0;
  let start: number | null = null;
  const step = (time: number) => {
    start ??= time;
    const progress = Math.min(1, (time - start) / duration);
    stack.scrollTop = from + (to - from) * ease(progress);
    if (progress < 1) frame = requestAnimationFrame(step);
    else {
      stack.scrollTop = to;
      timer = window.setTimeout(() => {
        stack.style.scrollSnapType = "";
        onDone();
      }, 60);
    }
  };
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    stack.style.scrollSnapType = "";
  };
}
