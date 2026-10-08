import type { Bar, Chart, NavMark, Section } from "./types.js";
import type { Warn } from "./warnings.js";

/** One bar of the play order: where it is, and which pass of its repeat is being played. */
export interface PlayStep {
  /** Index into `chart.sections`. */
  section: number;
  /** The bar's number in its section: 0 for a pickup. */
  bar: number;
  pass: number;
}

const NAV_LABELS: Record<NavMark, string> = {
  segno: "Segno",
  coda: "Coda",
  tocoda: "To Coda",
  fine: "Fine",
  ds: "D.S.",
  dsalcoda: "D.S. al Coda",
  dsalfine: "D.S. al Fine",
  dc: "D.C.",
  dcalcoda: "D.C. al Coda",
  dcalfine: "D.C. al Fine",
};
const JUMPS: readonly NavMark[] = ["ds", "dsalcoda", "dsalfine", "dc", "dcalcoda", "dcalfine"];
const MAX_STEPS = 20000;

/** How many passes a repeat plays in total: written `:| 3x`, 2 when no count is written (spec 10). */
const timesOf = (bar: Bar | undefined) => bar?.repeatEnd?.times || 2;

interface Flat {
  section: number;
  bar: Bar;
  line: number;
  /** The passes of the ending this bar belongs to, or null (spec 10: an ending covers the bars after it in its row). */
  ending: number[] | null;
}

/** Numbers each section's bars: 0 for a pickup, then 1, 2, ... (spec 5.3). */
export function numberBars(sections: readonly Section[]): void {
  for (const section of sections) {
    let number = 0;
    for (const row of section.rows)
      for (const bar of row.bars) bar.number = bar.pickup === undefined ? ++number : 0;
  }
}

function flatten(sections: readonly Section[]): Flat[] {
  const flat: Flat[] = [];
  sections.forEach((section, index) => {
    for (const row of section.rows) {
      let ending: number[] | null = null;
      for (const bar of row.bars) {
        if (bar.ending) ending = bar.ending;
        flat.push({ section: index, bar, line: row.line, ending });
      }
    }
  });
  return flat;
}

interface Plan {
  flat: Flat[];
  /** Repeat spans: the bar a repeat starts at to the bar it ends at, and back. */
  startToEnd: Map<number, number>;
  endToStart: Map<number, number>;
  jump: { at: number; mark: NavMark } | null;
  segno: number | undefined;
  coda: number | undefined;
  toCoda: number | undefined;
  fine: number | undefined;
}

/**
 * Finds the repeat spans and the navigation of a chart (spec 10 and 10.1), and reports what
 * is wrong with passes (9.1) and jumps through `warn`. The chart still reads as written.
 */
function plan(sections: readonly Section[], warn?: Warn): Plan {
  const flat = flatten(sections);
  const startToEnd = new Map<number, number>();
  const endToStart = new Map<number, number>();
  const inRepeat = new Set<number>();
  let from = 0;
  flat.forEach((item, index) => {
    if (index === 0 || flat[index - 1]?.section !== item.section) from = index;
    if (item.bar.repeatStart) from = index;
    if (item.bar.repeatEnd) {
      startToEnd.set(from, index);
      endToStart.set(index, from);
      for (let k = from; k <= index; k++) inRepeat.add(k);
      from = index + 1;
    }
  });

  // Spec 9.1: a pass on a bar outside any repeat, or on a note in a section with no repeat.
  flat.forEach((item, index) => {
    if (item.ending) inRepeat.add(index);
    if (item.bar.cues.some((cue) => cue.passes.length > 0) && !inRepeat.has(index)) {
      warn?.(item.line, "pass-without-repeat");
    }
  });
  for (const section of sections) {
    if (section.rows.some((row) => row.bars.some((bar) => bar.repeatEnd))) continue;
    for (const note of section.notes)
      if (note.passes.length > 0) warn?.(note.line, "note-pass-without-repeat");
  }

  const find = (mark: NavMark) =>
    flat.flatMap((item, index) => (item.bar.nav?.includes(mark) ? [index] : []));
  for (const mark of ["segno", "coda", "tocoda", "fine"] as const) {
    const at = find(mark);
    if (at.length > 1)
      warn?.(flat[at[1] as number]?.line ?? 0, "nav-duplicate", { mark: NAV_LABELS[mark] });
  }
  const jumps = flat.flatMap((item, index) => {
    const mark = item.bar.nav?.find((nav) => JUMPS.includes(nav));
    return mark ? [{ at: index, mark }] : [];
  });
  if (jumps.length > 1) warn?.(flat[(jumps[1] as { at: number }).at]?.line ?? 0, "nav-second-jump");

  let jump = jumps[0] ?? null;
  const [segno] = find("segno");
  const [coda] = find("coda");
  const [toCoda] = find("tocoda");
  const [fine] = find("fine");
  if (jump) {
    const line = flat[jump.at]?.line ?? 0;
    const label = NAV_LABELS[jump.mark];
    if (jump.mark.startsWith("ds") && segno === undefined) {
      warn?.(line, "nav-needs-segno");
      jump = null;
    } else if (jump.mark.endsWith("alcoda") && (coda === undefined || toCoda === undefined)) {
      warn?.(line, "nav-needs-coda", { mark: label });
      jump = null;
    } else if (jump.mark.endsWith("alfine") && fine === undefined) {
      warn?.(line, "nav-needs-fine", { mark: label });
      jump = null;
    }
  }
  return { flat, startToEnd, endToStart, jump, segno, coda, toCoda, fine };
}

/** Numbers the bars and checks passes and navigation, reporting through `warn` (spec 9.1, 10.1). */
export function analyze(sections: readonly Section[], warn: Warn): void {
  numberBars(sections);
  plan(sections, warn);
}

/**
 * The bars in the order they are played, after repeats, endings and navigation (spec 10 and
 * 10.1). A jump with no target is ignored, as the spec says the chart still renders as written.
 */
export function playOrder(chart: Pick<Chart, "sections">): PlayStep[] {
  const { flat, startToEnd, endToStart, jump, segno, coda, toCoda, fine } = plan(chart.sections);
  const order: PlayStep[] = [];
  let i = 0;
  let pass = 1;
  let current = -1;
  let inSpan = false;
  let jumped = false;
  let back = false;
  let steps = 0;

  while (i < flat.length && steps++ < MAX_STEPS) {
    const item = flat[i] as Flat;
    const bar = item.bar;
    if (startToEnd.has(i) && !back) {
      current = startToEnd.get(i) as number;
      inSpan = true;
      // After the jump each repeat is played once, taking its last ending (spec 10.1).
      pass = jumped ? timesOf(flat[current]?.bar) : 1;
    }
    back = false;
    if (item.ending && !item.ending.includes(pass)) {
      if (i === current) inSpan = false;
      i++;
      continue;
    }
    if (!item.ending && !inSpan) pass = 1;
    order.push({ section: item.section, bar: bar.number, pass });
    if (jumped && jump?.mark.endsWith("alcoda") && i === toCoda) {
      i = coda as number;
      inSpan = false;
      pass = 1;
      continue;
    }
    if (jumped && jump?.mark.endsWith("alfine") && i === fine) break;
    if (bar.repeatEnd && i === current) {
      inSpan = false;
      if (!jumped && pass < timesOf(bar)) {
        pass++;
        i = endToStart.get(i) as number;
        inSpan = true;
        back = true;
        continue;
      }
    }
    if (jump && !jumped && i === jump.at) {
      jumped = true;
      i = jump.mark.startsWith("ds") ? (segno as number) : 0;
      pass = 1;
      inSpan = false;
      continue;
    }
    i++;
  }
  return order;
}
