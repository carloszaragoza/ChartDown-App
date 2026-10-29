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

  it("R-03.14 at 150 from 0:04, a bar chosen is counted into, not the one before (T-3026)", () => {
    // The owner's chart: 4/4 at 150, a bar is 1.6 s, the music from 0:04. A player moved to a
    // bar reads back its time to the millisecond, and 1.6 × 3 is 4.800000000000001.
    const song = parse(
      "---\ntempo: 150\nmeter: 4/4\n---\n## Verse\n1 | 4 | 5 | 1\n## Chorus 1\n1 | 1 | 1maj7 | 1maj7\n",
    );
    const second = barStart(song, 1, 2) ?? 0;
    const moved = Math.floor((4 + second) * 1000) / 1000;
    const count = countIn(song, moved, 4);
    expect(count?.at).toBeCloseTo(4 + second, 6);
    // Heard from the bar before it, Chorus 1's first, under the count.
    expect((count?.at ?? 0) - (count?.length ?? 0)).toBeCloseTo(4 + second - 1.6, 6);
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
