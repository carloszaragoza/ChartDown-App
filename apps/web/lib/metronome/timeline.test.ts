import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { timeline } from "./timeline";

/** Each bar as "section.bar/pass", the way a musician walks through the form. */
const walk = (source: string) =>
  timeline(parse(source)).map((bar) => `${bar.section}.${bar.number}/${bar.pass}`);

describe("T-1501 the metronome's timeline", () => {
  it("R-11.4 a repeat with two endings goes back and plays the second ending on the second pass", () => {
    expect(walk("## Verse\n|: 1 | 4 | [1] 5 :| x2\n[2] 6m |\n## Chorus\n4 | 1\n")).toEqual([
      "0.1/1",
      "0.2/1",
      "0.3/1",
      "0.1/2",
      "0.2/2",
      "0.4/2",
      "1.1/1",
      "1.2/1",
    ]);
  });

  it("R-11.4 a reused section and a D.S. al Coda follow the play order", () => {
    const source =
      "## Verse\n{segno} 1 | 4 {to coda} | 5\n## Chorus\n4 | 5 {D.S. al coda}\n## Outro\n{coda} 1 | 1\n## Again\n@use Chorus\n";
    const bars = walk(source);
    expect(bars.slice(0, 5)).toEqual(["0.1/1", "0.2/1", "0.3/1", "1.1/1", "1.2/1"]);
    // Back to the sign, on to the coda.
    expect(bars.slice(5, 9)).toEqual(["0.1/1", "0.2/1", "2.1/1", "2.2/1"]);
  });

  it("R-11.4 every bar says where it is drawn: its row and its place in the row", () => {
    const bars = timeline(parse("## A\n1 | 4\n5 | 1\n"));
    expect(bars.map(({ row, index }) => [row, index])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
  });

  it("R-11.5 a 6/8 bar counts six beats, strong on 1 and semi-strong on 4", () => {
    const [bar] = timeline(parse("---\nmeter: 6/8\n---\n## A\n1\n"));
    expect(bar?.beats.map((beat) => beat.count)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(bar?.beats.map((beat) => beat.strength)).toEqual([
      "strong",
      "weak",
      "weak",
      "semi",
      "weak",
      "weak",
    ]);
  });

  it("R-11.5 3/4 counts three; a [m:2/4] bar two; an @meter changes the bars after it", () => {
    const bars = timeline(parse("---\nmeter: 3/4\n---\n## A\n1 | [m:2/4] 4\n@meter 4/4\n5\n"));
    expect(bars.map((bar) => bar.beats.length)).toEqual([3, 2, 4]);
  });

  it("R-11.5 an uneven split names the chord sounding on each beat", () => {
    const [bar] = timeline(parse("## A\n4:2 4:1 5:1\n"));
    expect(bar?.beats.map((beat) => beat.item)).toEqual([0, 0, 1, 2]);
    const [even] = timeline(parse("## A\n1 4\n"));
    expect(even?.beats.map((beat) => beat.item)).toEqual([0, 0, 1, 1]);
  });

  it("R-11.5 a pickup counts only its own beats, the last of the bar", () => {
    const [pickup, first] = timeline(parse("## A\n[p:1] 5 | 1\n"));
    expect(pickup?.beats.map((beat) => beat.count)).toEqual([4]);
    expect(first?.beats.map((beat) => beat.count)).toEqual([1, 2, 3, 4]);
  });

  it("R-11.1 the tempo comes from the chart, an @tempo, or the set when it gives one", () => {
    const source = "---\ntempo: 76\n---\n## A\n1\n@tempo 90\n4\n";
    expect(timeline(parse(source)).map((bar) => bar.tempo)).toEqual([76, 90]);
    expect(timeline(parse(source), { tempo: 120 }).map((bar) => bar.tempo)).toEqual([120, 120]);
    expect(timeline(parse("## A\n1\n"))[0]?.tempo).toBeUndefined();
  });

  it("R-11.6 a bar with a fermata says so", () => {
    expect(timeline(parse("## A\n1 | 4~\n")).map((bar) => bar.fermata)).toEqual([false, true]);
  });
});
