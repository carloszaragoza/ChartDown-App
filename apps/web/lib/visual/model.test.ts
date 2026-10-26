import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import {
  addIndication,
  addNote,
  addSection,
  deleteSection,
  insertBar,
  markChord,
  repeatSection,
  repeatsOf,
  setBar,
  step,
} from "./edit";
import {
  canonicalText,
  chartText,
  emptySection,
  indication,
  isKnownToken,
  needsAttention,
  nextName,
  splitNeed,
  visualChart,
  type VisualBar,
  type VisualChart,
} from "./model";

const start = (): VisualChart => ({
  meta: { key: "G", tempo: "72", meter: "4/4" },
  sections: [emptySection("Verse 1")],
});
const bar = (chords: string, more: Partial<VisualBar> = {}): VisualBar => ({
  ...emptySection("A", 1).bars[0]!,
  chords,
  ...more,
});
const lastLine = (text: string) => text.trimEnd().split("\n").at(-1);

describe("T-3002 the visual editor's chart", () => {
  it("R-13.1 what is saved is the canonical text, title first, and reads back as the same chart", () => {
    let chart = start();
    chart = setBar(chart, { section: 0, bar: 0 }, { chords: "1 2 4sus" });
    chart = setBar(chart, { section: 0, bar: 1 }, { chords: "5" });
    const text = canonicalText(chart, "Open Road");
    expect(text).toBe(
      "---\nchartdown: 0.10\ntitle: Open Road\nkey: G\ntempo: 72\nmeter: 4/4\n---\n\n## Verse 1\n1 2 4sus | 5\n",
    );
    expect(parse(text).warnings).toEqual([]);
    expect(canonicalText(visualChart(text), "Open Road")).toBe(text);
  });

  it("R-13.1 a chart written by hand opens with its bars, lines and notes", () => {
    const text =
      '---\ntitle: Song\nkey: G\n---\n## Verse\n> MD keys: Pad only\n|: 1 {mf} "Take the road" | \'5:3 6m :| 3x\n## Chorus\n4 {drums: in} | 5 {f}\n## Again\n@use Chorus 2x\n';
    const chart = visualChart(text);
    expect(chart.meta).toEqual({ key: "G" });
    const [verse, chorus, again] = chart.sections;
    expect(verse?.notes).toEqual([{ md: true, roles: ["keys"], passes: [], text: "Pad only" }]);
    expect(verse?.bars[0]).toMatchObject({
      chords: "1",
      top: "mf",
      lyric: "Take the road",
      repeatStart: true,
    });
    expect(verse?.bars[1]).toMatchObject({ chords: "'5 6m", split: [3, 1], repeatEnd: 3 });
    expect(chorus?.bars.map((b) => b.top)).toEqual(["drums: in", "f"]);
    expect(again).toMatchObject({ use: "Chorus", times: 2, bars: [] });
    expect(parse(canonicalText(chart, "Song")).warnings).toEqual([]);
  });

  it("R-13.4 a bar's three lines: indications above, chords, the lyric below", () => {
    const chart = setBar(
      start(),
      { section: 0, bar: 0 },
      {
        chords: "1 4",
        top: "Drums in, mf, D.S. al Coda",
        lyric: "Take the open road",
      },
    );
    expect(lastLine(canonicalText(chart, ""))).toBe(
      '{mf} 1 4 {drums: in} "Take the open road" {D.S. al coda}',
    );
  });

  it("R-13.4 indications as typed become ChartDown's words", () => {
    expect(indication("Drums in")).toBe("{drums: in}");
    expect(indication("cresc.")).toBe("{cresc.}");
    expect(indication("dim")).toBe("{decresc}");
    expect(indication("Coda")).toBe("{Coda}");
    expect(indication("keys & bass: out")).toBe("{keys & bass: out}");
    expect(indication("Big ending")).toBe("{Big ending}");
  });

  it("R-13.4 a chord ChartDown doesn't read is told apart, to be drawn in red", () => {
    expect(isKnownToken("6m7")).toBe(true);
    expect(isKnownToken("'5sus")).toBe(true);
    expect(isKnownToken("4zz")).toBe(false);
    expect(isKnownToken("hello")).toBe(false);
  });

  it("R-13.4 the lyric keeps 8 words at most (no lyrics)", () => {
    const chart = setBar(
      start(),
      { section: 0, bar: 0 },
      {
        chords: "1",
        lyric: "one two three four five six seven eight nine ten",
      },
    );
    expect(lastLine(canonicalText(chart, ""))).toBe('1 "one two three four five six seven eight"');
  });

  it("R-13.6 the beats split evenly by themselves, or ask for a choice", () => {
    expect(splitNeed(bar("1"), "4/4")).toEqual({ kind: "even" });
    expect(splitNeed(bar("1 4"), "4/4")).toEqual({ kind: "even" });
    expect(splitNeed(bar("1 4 5 6"), "4/4")).toEqual({ kind: "even" });
    expect(splitNeed(bar("1 4 5"), "4/4")).toEqual({
      kind: "choose",
      options: [
        [2, 1, 1],
        [1, 2, 1],
        [1, 1, 2],
      ],
    });
    expect(splitNeed(bar("1 4"), "3/4")).toEqual({
      kind: "choose",
      options: [
        [2, 1],
        [1, 2],
      ],
    });
    expect(splitNeed(bar("1 2 3 4 5"), "4/4")).toEqual({ kind: "over" });
    // 6/8 counts dotted quarters: two chords take one each.
    expect(splitNeed(bar("1 4"), "6/8")).toEqual({ kind: "even" });
  });

  it("R-13.6 R-13.8 three chords with no split are marked; 2+1+1 writes 1:2 4 5", () => {
    expect(needsAttention(bar("1 4 5"), "4/4")).toBe(true);
    expect(needsAttention(bar("1 4 5", { split: [2, 1, 1] }), "4/4")).toBe(false);
    expect(needsAttention(bar("1 2 3 4 5"), "4/4")).toBe(true);
    const chart = setBar(start(), { section: 0, bar: 0 }, { chords: "1 4 5", split: [2, 1, 1] });
    expect(lastLine(canonicalText(chart, ""))).toBe("1:2 4 5");
  });

  it("R-13.6 a new chords line drops the split chosen for the old one", () => {
    let chart = setBar(start(), { section: 0, bar: 0 }, { chords: "1 4 5", split: [2, 1, 1] });
    chart = setBar(chart, { section: 0, bar: 0 }, { chords: "1 4" });
    expect(chart.sections[0]?.bars[0]?.split).toBeNull();
  });

  it("R-13.7 tools: a push on the 5 writes '5, a repeat 3x writes :| 3x, a coda {coda}", () => {
    expect(markChord(bar("4 5"), "push")).toBe("4 '5");
    expect(markChord(bar("4 '5"), "push")).toBe("4 5");
    expect(markChord(bar("4 5"), "stab", 0)).toBe("4! 5");
    expect(markChord(bar("4 5"), "hold")).toBe("4 <5>");
    let chart = setBar(start(), { section: 0, bar: 0 }, { chords: "1", repeatStart: true });
    chart = setBar(chart, { section: 0, bar: 1 }, { chords: "5", repeatEnd: 3 });
    chart = setBar(chart, { section: 0, bar: 2 }, { chords: "4", top: addIndication("", "Coda") });
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual([
      "|: 1 | 5 :| 3x",
      "{coda} 4",
    ]);
  });

  it("R-13.9 sections: Verse 2 after Verse 1, a repeat with @use, deleting a repeated one", () => {
    let chart = start();
    expect(nextName(chart.sections, "Section")).toBe("Verse 2");
    chart = addSection(chart, 0, "Chorus");
    chart = setBar(chart, { section: 1, bar: 0 }, { chords: "4" });
    chart = setBar(chart, { section: 0, bar: 0 }, { chords: "1" });
    chart = repeatSection(chart, 1, 2);
    expect(canonicalText(chart, "")).toContain("## Chorus\n4\n\n## Chorus\n@use Chorus 2x\n");
    expect(repeatsOf(chart, 1)).toBe(1);
    expect(deleteSection(chart, 1).sections.map((s) => s.name)).toEqual(["Verse 1"]);
  });

  it("R-13.10 an inserted bar keeps the row; Tab steps to the next bar, across sections", () => {
    let chart = setBar(start(), { section: 0, bar: 0 }, { chords: "1" });
    chart = setBar(chart, { section: 0, bar: 1 }, { chords: "5" });
    chart = insertBar(chart, { section: 0, bar: 0 }, "after");
    chart = setBar(chart, { section: 0, bar: 1 }, { chords: "4" });
    expect(lastLine(canonicalText(chart, ""))).toBe("1 | 4 | 5");
    chart = addSection(chart, 0, "Chorus");
    expect(step(chart, { section: 0, bar: 4 }, 1)).toEqual({ section: 1, bar: 0 });
    expect(step(chart, { section: 1, bar: 0 }, -1)).toEqual({ section: 0, bar: 4 });
    expect(step(chart, { section: 0, bar: 0 }, -1)).toBeNull();
  });

  it("R-13.11 every change makes a new chart, so the one before stays for undo", () => {
    const before = start();
    const after = setBar(before, { section: 0, bar: 0 }, { chords: "1" });
    expect(before.sections[0]?.bars[0]?.chords).toBe("");
    expect(after.sections[0]?.bars[0]?.chords).toBe("1");
  });

  it("R-13.14 the MD's indications: for everyone, the MD's, for keys on the second pass", () => {
    let chart = setBar(start(), { section: 0, bar: 0 }, { chords: "1" });
    chart = addNote(chart, 0, { md: false, roles: ["everyone"], passes: [], text: "Soft" });
    chart = addNote(chart, 0, { md: true, roles: ["everyone"], passes: [], text: "Watch me" });
    chart = addNote(chart, 0, { md: true, roles: ["keys"], passes: [2], text: "Pad only" });
    expect(canonicalText(chart, "")).toContain(
      "## Verse 1\n> Soft\n> MD: Watch me\n> MD 2x keys: Pad only\n1\n",
    );
  });

  it("R-13.3 empty bars keep their place on screen and are left out of what is saved", () => {
    const chart = setBar(start(), { section: 0, bar: 1 }, { chords: "5" });
    expect(lastLine(chartText(chart, "rest"))).toBe("x | 5 | x | x");
    expect(lastLine(canonicalText(chart, ""))).toBe("5");
  });
});
