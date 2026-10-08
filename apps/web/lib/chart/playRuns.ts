import { playOrder, type Chart } from "chartdown";

/** A stretch of the play order inside one section. */
export interface PlayRun {
  /** Index into `chart.sections`. */
  section: number;
  from: number;
  to: number;
  /** The run covers every bar of the section, so no bars are shown with its name. */
  full: boolean;
}

/** Whether the song has a D.S. or D.C. jump that can be taken: only then is the play order shown. */
export const hasJump = (chart: Chart): boolean => playOrder(chart).some((step) => step.jump);

/**
 * The play order as runs of one section each (R-00.9): a new run starts when the section changes
 * and after every jump. A run that skips bars of its section carries its range.
 */
export function playRuns(chart: Chart): PlayRun[] {
  const runs: { section: number; bars: number[] }[] = [];
  for (const step of playOrder(chart)) {
    const last = runs[runs.length - 1];
    if (last && last.section === step.section && !step.jump) last.bars.push(step.bar);
    else runs.push({ section: step.section, bars: [step.bar] });
  }
  return runs.map(({ section, bars }) => {
    const all = (chart.sections[section]?.rows ?? []).flatMap((row) =>
      row.bars.map((bar) => bar.number),
    );
    const from = Math.min(...bars);
    const to = Math.max(...bars);
    return { section, from, to, full: from === Math.min(...all) && to === Math.max(...all) };
  });
}
