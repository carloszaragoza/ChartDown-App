import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import {
  addIndication,
  addRow,
  appendBar,
  addNote,
  copyBars,
  addSection,
  deleteRow,
  deleteSection,
  hasIndication,
  hasMark,
  holdUntil,
  insertBar,
  markChord,
  pasteBars,
  repeatSection,
  repeatsOf,
  setBar,
  setNote,
  setRowChange,
  splitSection,
  step,
  toggleIndication,
  toggleMark,
  writeBars,
} from "./edit";
import {
  afterSave,
  canonicalText,
  chartText,
  emptySection,
  indication,
  isKnownToken,
  needsAttention,
  nextName,
  splitNeed,
  suggestSection,
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

  it("R-13.4 a token with its beats is read, whatever the bar adds up to (T-3018)", () => {
    expect(isKnownToken("x:3")).toBe(true);
    expect(isKnownToken("1/3:1")).toBe(true);
    expect(isKnownToken("6m7:2")).toBe(true);
    expect(isKnownToken("4zz:2")).toBe(false);
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
    // With more chords than dotted quarters, 6/8 counts its eighths: three take two each.
    expect(splitNeed(bar("1 4 5"), "6/8")).toEqual({ kind: "even" });
    expect(splitNeed(bar("1 4 5 1"), "6/8")).toMatchObject({ kind: "choose" });
    expect(splitNeed(bar("1 4 5"), "12/8")).toMatchObject({ kind: "choose" });
    expect(splitNeed(bar("1 2 3 4 5 6 7"), "6/8")).toEqual({ kind: "over" });
  });

  it("R-13.6 R-13.8 three chords with no split are marked; 2+1+1 writes 1:2 4 5", () => {
    expect(needsAttention(bar("1 4 5"), "4/4")).toBe(true);
    expect(needsAttention(bar("1 4 5", { split: [2, 1, 1] }), "4/4")).toBe(false);
    expect(needsAttention(bar("1 2 3 4 5"), "4/4")).toBe(true);
    const chart = setBar(start(), { section: 0, bar: 0 }, { chords: "1 4 5", split: [2, 1, 1] });
    expect(lastLine(canonicalText(chart, ""))).toBe("1:2 4 5");
  });

  it("R-13.6 R-13.8 beats written in the bar are its split, marked only if they don't add up (T-3019)", () => {
    expect(splitNeed(bar("x:3 1:0.5! 1:0.5!"), "4/4")).toEqual({ kind: "even" });
    expect(splitNeed(bar("x:3 R[1 1]"), "4/4")).toEqual({ kind: "even" });
    expect(needsAttention(bar("x:3 1:0.5! 1:0.5!"), "4/4")).toBe(false);
    expect(splitNeed(bar("x:3 1:2"), "4/4")).toEqual({ kind: "uneven", sum: 5, beats: 4 });
    expect(needsAttention(bar("x:3 1:2"), "4/4")).toBe(true);
    expect(splitNeed(bar("1:4 4:2"), "6/8")).toEqual({ kind: "even" });
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

  it("R-13.7 a tool already on the chord or bar shows pressed, and tapping it again takes it off", () => {
    expect(hasMark("'5!", "push")).toBe(true);
    expect(hasMark("'5!", "shortPush")).toBe(false);
    expect(hasMark("'5!", "stab")).toBe(true);
    expect(hasMark("<4>~", "hold")).toBe(true);
    expect(hasMark("x", "push")).toBe(false);
    expect(toggleMark("'5!", "push")).toBe("5!");
    expect(toggleMark("<4>~", "hold")).toBe("4~");
    expect(hasIndication("mf, Coda", "coda")).toBe(true);
    expect(toggleIndication("mf, Coda", "Coda")).toBe("mf");
    expect(toggleIndication("mf", "Fine")).toBe("mf, Fine");
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

  it("R-13.9 a new section is named as songs usually go: Verse 2, Chorus, Interlude, Bridge", () => {
    const named = (...names: string[]) => names.map((name) => emptySection(name));
    expect(suggestSection(named("Verse 1"), 0, "en")).toBe("Verse 2");
    expect(suggestSection(named("Verse 1", "Verse 2"), 1, "en")).toBe("Chorus");
    expect(suggestSection(named("Verse 1", "Verse 2", "Chorus"), 2, "en")).toBe("Interlude");
    expect(suggestSection(named("Verse 1", "Chorus", "Interlude"), 2, "en")).toBe("Bridge");
    expect(suggestSection(named("Verse 1", "Verse 2", "Chorus", "Bridge"), 3, "en")).toBe(
      "Verse 3",
    );
    expect(suggestSection(named("Intro"), 0, "en")).toBe("Verse 1");
    expect(suggestSection(named("Pre-Chorus"), 0, "en")).toBe("Chorus");
    // A chorus already written: the next one is numbered.
    expect(suggestSection(named("Verse 1", "Verse 2", "Chorus", "Verse 3"), 3, "en")).toBe(
      "Chorus 2",
    );
    // After Verse 1 when Verse 2 is already there, the chorus.
    expect(suggestSection(named("Verse 1", "Verse 2"), 0, "en")).toBe("Chorus");
  });

  it("R-13.9 the names follow the chart's language, or the interface's", () => {
    const named = (...names: string[]) => names.map((name) => emptySection(name));
    expect(suggestSection(named("Verso 1"), 0, "en")).toBe("Verso 2");
    expect(suggestSection(named("Verso 1", "Verso 2"), 1, "en")).toBe("Coro");
    expect(suggestSection(named("Coro"), 0, "en")).toBe("Interludio");
    expect(suggestSection(named("Interludio"), 0, "en")).toBe("Puente");
    expect(suggestSection(named("Solo de Juan"), 0, "es")).toBe("Verso 1");
  });

  it("R-13.10 rows of four: Tab past a full row starts a new one, and Add a row adds four bars", () => {
    let chart = start();
    ["1", "4", "5", "1"].forEach((chords, bar) => {
      chart = setBar(chart, { section: 0, bar }, { chords });
    });
    chart = appendBar(chart, 0);
    chart = setBar(chart, { section: 0, bar: 4 }, { chords: "6m" });
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual([
      "1 | 4 | 5 | 1",
      "6m",
    ]);
    chart = addRow(chart, 0);
    chart = setBar(chart, { section: 0, bar: 5 }, { chords: "4" });
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual(["6m", "4"]);
  });

  it("R-13.10 Delete this row takes the whole row of the bar, and the rows after it stay", () => {
    let chart = visualChart("## Verse\n6 | 6 | 5 | 4\n7\n7 | 7 | 7 | 7\n");
    chart = deleteRow(chart, { section: 0, bar: 4 });
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual([
      "6 | 6 | 5 | 4",
      "7 | 7 | 7 | 7",
    ]);
    chart = deleteRow(deleteRow(chart, { section: 0, bar: 0 }), { section: 0, bar: 0 });
    expect(chart.sections[0]?.bars).toHaveLength(1);
  });

  it("R-13.10 a copied bar pastes over another whole, and the place keeps where its row starts", () => {
    let chart = visualChart('## Verse\n1 {drums: in} "Was blind" | 4 | 5 | 1\n6m | 4\n');
    const clip = copyBars(chart, { section: 0, bar: 0 }, "bar");
    expect(clip?.bars).toHaveLength(1);
    chart = pasteBars(chart, { section: 0, bar: 4 }, clip!, "over");
    const bar = chart.sections[0]?.bars[4];
    expect(bar?.chords).toBe("1");
    expect(bar?.top).toBe(chart.sections[0]?.bars[0]?.top);
    expect(bar?.lyric).toBe("Was blind");
    // The second row still starts there.
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual([
      expect.stringMatching(/^1 .*\| 4 \| 5 \| 1$/),
      expect.stringMatching(/^1 .*\| 4$/),
    ]);
  });

  it("R-13.10 a copied row pasted after a row's last bar is a row of its own", () => {
    let chart = visualChart("## Verse\n1 | 4 | 5 | 1\n6m | 4\n");
    const clip = copyBars(chart, { section: 0, bar: 2 }, "row");
    chart = pasteBars(chart, { section: 0, bar: 3 }, clip!, "after");
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-3)).toEqual([
      "1 | 4 | 5 | 1",
      "1 | 4 | 5 | 1",
      "6m | 4",
    ]);
  });

  it("R-13.10 pasting over past the section's end adds bars, four to a row", () => {
    let chart = visualChart("## Verse\n1 | 4 | 5\n");
    const clip = copyBars(chart, { section: 0, bar: 0 }, "row");
    chart = pasteBars(chart, { section: 0, bar: 2 }, clip!, "over");
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual([
      "1 | 4 | 1 | 4",
      "5",
    ]);
  });

  it("R-13.10 a key, meter and tempo change at a bar writes its lines before the row it starts", () => {
    let chart = visualChart("---\nkey: G\n---\n## Verse\n1 | 4 | 5 | 1\n");
    chart = setRowChange(chart, { section: 0, bar: 2 }, { key: "A", meter: "3/4", tempo: "90" });
    const text = canonicalText(chart, "");
    expect(text.trimEnd().split("\n").slice(-5)).toEqual([
      "1 | 4",
      "@key A",
      "@meter 3/4",
      "@tempo 90",
      "5 | 1",
    ]);
    expect(parse(text).warnings).toEqual([]);
    // The chart drawn from it says the change above that row.
    expect(parse(text).sections[0]?.rows[1]?.keyChange).toBeTruthy();
  });

  it("R-13.10 clearing a change leaves the row and no change; a bar with none is left as it was", () => {
    let chart = visualChart("## Verse\n1 | 4 | 5 | 1\n");
    chart = setRowChange(chart, { section: 0, bar: 2 }, { key: "A", meter: "", tempo: "" });
    chart = setRowChange(chart, { section: 0, bar: 2 }, { key: "", meter: "", tempo: "" });
    expect(canonicalText(chart, "").trimEnd().split("\n").slice(-2)).toEqual(["1 | 4", "5 | 1"]);
    const same = setRowChange(chart, { section: 0, bar: 1 }, { key: "", meter: "", tempo: "" });
    expect(same.sections[0]?.bars[1]?.row).toBeNull();
  });

  it("R-13.7 Hold until a cue holds the last chord with a fermata and writes the cue", () => {
    let chart = visualChart("## Verse\n1 | 4 5\n");
    chart = holdUntil(chart, { section: 0, bar: 1 }, "until the vocal, comes in");
    chart = holdUntil(chart, { section: 0, bar: 1 }, "until the vocal, comes in");
    const text = canonicalText(chart, "");
    expect(lastLine(text)).toBe("1 | 4 <5>~ {until the vocal comes in}");
    expect(parse(text).warnings).toEqual([]);
    // A bar with no chord has nothing to hold.
    const empty = visualChart("## Verse\nx\n");
    expect(holdUntil(empty, { section: 0, bar: 0 }, "the vocal")).toBe(empty);
  });

  it("R-13.5 a bar line typed in a bar ends it: what follows goes on in a new bar after it", () => {
    const chart = visualChart("## Verse\n1 | 5\n");
    const written = writeBars(chart, { section: 0, bar: 0 }, "6m7 '1/3 | 4");
    expect(written.chart.sections[0]?.bars.map((bar) => bar.chords)).toEqual([
      "6m7 '1/3",
      "4",
      "5",
    ]);
    expect(written.at).toEqual({ section: 0, bar: 1 });
    expect(lastLine(canonicalText(written.chart, ""))).toBe("6m7 '1/3 | 4 | 5");
  });

  it("R-13.5 a bar line fills an empty next bar, and one typed last opens a bar to write in", () => {
    let chart = visualChart("## Verse\n1\n");
    chart = appendBar(chart, 0);
    const filled = writeBars(chart, { section: 0, bar: 0 }, "1 | 4");
    expect(filled.chart.sections[0]?.bars.map((bar) => bar.chords)).toEqual(["1", "4"]);
    const open = writeBars(filled.chart, { section: 0, bar: 1 }, "4 |");
    expect(open.chart.sections[0]?.bars.map((bar) => bar.chords)).toEqual(["1", "4", ""]);
    expect(open.at).toEqual({ section: 0, bar: 2 });
  });

  it("R-13.3 after Save the editor drops the bars added and left empty, as the saved text does", () => {
    let chart = visualChart("## Verse\n1 | 4 | 5 | 1\n");
    chart = addRow(chart, 0);
    chart = setBar(chart, { section: 0, bar: 4 }, { chords: "6m" });
    expect(chart.sections[0]?.bars).toHaveLength(8);
    const saved = afterSave(chart);
    expect(saved.sections[0]?.bars.map((bar) => bar.chords)).toEqual(["1", "4", "5", "1", "6m"]);
  });

  it("R-13.3 a bar with an indication or a lyric but no chords is saved as a rest with them", () => {
    let chart = visualChart("## Verse\n1 | 4\n");
    chart = appendBar(chart, 0);
    chart = setBar(chart, { section: 0, bar: 2 }, { top: "Drums in", lyric: "Was blind" });
    chart = appendBar(chart, 0);
    expect(lastLine(canonicalText(chart, ""))).toBe('1 | 4 | x {drums: in} "Was blind"');
    expect(afterSave(chart).sections[0]?.bars).toHaveLength(3);
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

  it("R-13.14 a note is changed in place, the others kept in their order", () => {
    let chart = visualChart("## Verse\n> MD: Soft\n> MD keys: Pad only\n1 | 4\n");
    chart = setNote(chart, 0, 1, { md: true, roles: ["bass"], passes: [2], text: "Walk up" });
    expect(canonicalText(chart, "")).toContain("> MD: Soft\n> MD 2x bass: Walk up");
  });

  it("R-13.3 empty bars keep their place on screen and are left out of what is saved", () => {
    const chart = setBar(start(), { section: 0, bar: 1 }, { chords: "5" });
    expect(lastLine(chartText(chart, "rest"))).toBe("x | 5 | x | x");
    expect(lastLine(canonicalText(chart, ""))).toBe("5");
  });
});

describe("T-3028 splitting a section in two", () => {
  it("R-13.9 the rows after the split become the next section, its notes left with the first", () => {
    const chart = visualChart(
      "## Verse 1\n> MD: Keys and vocal.\n1 | 1 | 1sus | 1sus\n6m | 6m | 4 | 4\n6m7 | 4 | 5 | 5\n## Chorus 1\n4 | 1\n",
    );
    const split = splitSection(chart, 0, 4, "Verse 2");
    expect(split.sections.map((section) => section.name)).toEqual([
      "Verse 1",
      "Verse 2",
      "Chorus 1",
    ]);
    expect(split.sections[0]?.bars).toHaveLength(4);
    expect(split.sections[1]?.bars).toHaveLength(8);
    expect(split.sections[0]?.notes).toHaveLength(1);
    expect(split.sections[1]?.notes).toHaveLength(0);
    expect(canonicalText(split, "")).toContain(
      "## Verse 1\n> MD: Keys and vocal.\n1 | 1 | 1sus | 1sus\n\n## Verse 2\n6m | 6m | 4 | 4\n6m7 | 4 | 5 | 5\n",
    );
  });

  it("R-13.9 only between rows of a section written here: never at its ends, never a repeat", () => {
    const chart = visualChart("## Verse 1\n1 | 4\n## Again\n@use Verse 1\n");
    expect(splitSection(chart, 0, 0, "X")).toBe(chart);
    expect(splitSection(chart, 0, 2, "X")).toBe(chart);
    expect(splitSection(chart, 1, 1, "X")).toBe(chart);
  });
});
