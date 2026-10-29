import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { barStart } from "./sections";
import { countIn } from "./countIn";

const chart = parse("---\ntempo: 120\nmeter: 4/4\n---\n## Verse\n1 | 4 | 5 | 1\n");

describe("T-3023 the count-in before a recording", () => {
  it("R-03.14 before the music, one bar of four clicks, then the first bar where the music starts", () => {
    const count = countIn(chart, 0, 4);
    expect(count?.at).toBe(4);
    expect(count?.clicks.map((click) => [click.time, click.count, click.accent])).toEqual([
      [0, 1, true],
      [0.5, 2, false],
      [1, 3, false],
      [1.5, 4, false],
    ]);
    expect(count?.length).toBe(2);
  });

  it("R-03.14 paused in a bar, the recording starts again from that bar's start", () => {
    // At 120, a bar of 4/4 lasts 2 s: 4 + 2 + 1.3 is in the second bar, which starts at 6.
    expect(countIn(chart, 7.3, 4)?.at).toBe(6);
  });

  it("R-03.14 a bar chosen is the one counted, though the recording lands a hair before it (T-3026)", () => {
    // The third bar starts 4 s into the music, at 8 s in the recording.
    const at = 4 + (barStart(chart, 0, 3) ?? 0);
    expect(countIn(chart, at, 4)?.at).toBe(at);
    expect(countIn(chart, at - 0.03, 4)?.at).toBe(at);
    expect(countIn(chart, at - 1e-9, 4)?.at).toBe(at);
    // Paused well inside the bar before, that bar.
    expect(countIn(chart, at - 0.5, 4)?.at).toBe(at - 2);
  });

  it("R-03.14 past the music's end, from the first bar again", () => {
    expect(countIn(chart, 60, 4)?.at).toBe(4);
  });

  it("R-03.14 the count is in the meter of the bar it starts on", () => {
    const waltz = parse("---\ntempo: 90\nmeter: 3/4\n---\n## Verse\n1 | 4\n");
    expect(countIn(waltz, 0, 0)?.clicks).toHaveLength(3);
  });

  it("R-03.14 a chart with no tempo has no count", () => {
    expect(countIn(parse("## Verse\n1 | 4\n"), 0, 0)).toBeNull();
  });
});
