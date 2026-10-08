import { describe, expect, it } from "vitest";
import { chordFormatter } from "./display.js";
import { formatLayer, parseLayer, placeLayer } from "./layer.js";
import { sectionLength } from "./length.js";
import { playOrder } from "./navigation.js";
import { toJSON } from "./json.js";
import { parse } from "./parse.js";
import { fixture06 } from "./test-helpers.js";

const bars = (source: string) =>
  parse(source).sections.flatMap((section) => section.rows.flatMap((row) => row.bars));
const step = (section: number, bar: number, pass = 1, jump = false) => ({
  section,
  bar,
  pass,
  ...(jump ? { jump: true } : {}),
});

describe("R-00.6 pickup bars, meter and tempo changes", () => {
  it("R-00.6 a pickup is bar 0 and the first full bar is bar 1", () => {
    expect(bars("## A\n[p:2] 5 | 1 | 4").map((bar) => bar.number)).toEqual([0, 1, 2]);
  });

  it("R-00.6 a pickup is not counted in a section's bar count", () => {
    const chart = parse("## A\n[p:1] 5 | 1 | 4 | 5 | 1");
    expect(sectionLength(chart.sections[0] as (typeof chart.sections)[0]).total).toBe(4);
  });

  it("R-00.6 a layer counts a pickup as bar 0, so its notes land on the same bars as the chart's", () => {
    const chart = parse("## Intro\n[p:1] 5 | 1 | 4");
    const placement = placeLayer(chart, {
      notes: [
        { section: "Intro", occurrence: 1, bar: 2, roles: ["drums"], text: "last bar" },
        { section: "Intro", occurrence: 1, bar: 3, roles: ["drums"], text: "no such bar" },
      ],
    });
    expect(placement.sections[0]?.map((placed) => placed.bar)).toEqual([2]);
    expect(placement.unplaced.map((item) => item.reason)).toEqual(["bar"]);
  });

  it("R-00.6 @meter and @tempo stay in effect across sections until they change", () => {
    const chart = parse(
      "---\ntempo: 72\n---\n## A\n1\n@meter 6/8\n@tempo 90\n1:3 4:3\n## B\n5:3 1:3\n@meter 4/4\n1",
    );
    const rows = chart.sections.flatMap((section) => section.rows);
    expect(rows.map((row) => [`${row.meter.beats}/${row.meter.unit}`, row.tempo])).toEqual([
      ["4/4", 72],
      ["6/8", 90],
      ["6/8", 90],
      ["4/4", 90],
    ]);
    expect(rows.map((row) => row.meterChange !== undefined)).toEqual([false, true, false, true]);
    expect(chart.warnings).toEqual([]);
  });

  it("R-00.6 @use keeps the copied rows' meter and tempo, and takes the current key", () => {
    const chart = parse(
      "---\nkey: G\n---\n## A\n@meter 3/4\n@tempo 60\n1 | 4\n@key A\n## B\n@use A",
    );
    const copy = chart.sections[1]?.rows[0];
    expect(copy?.meter).toEqual({ beats: 3, unit: 4 });
    expect(copy?.tempo).toBe(60);
    expect(copy?.key.root).toBe("A");
  });

  it("R-00.6 {rit}, {accel} and {a tempo} are tempo marks, not cues", () => {
    const [rit, accel, back] = bars("## A\n1 {rit} | 4 {accel} | 5 {a tempo}");
    expect([rit?.tempoMark, accel?.tempoMark, back?.tempoMark]).toEqual(["rit", "accel", "atempo"]);
    expect(rit?.cues).toEqual([]);
  });
});

describe("R-00.7 riffs, partial rests and the sixteenth push", () => {
  it("R-00.7 a riff is single notes that share its beats", () => {
    const [bar] = bars("## A\nR[ 1 3 b7:2 x ]");
    expect(bar?.items[0]).toMatchObject({
      type: "riff",
      notes: [{ root: "1" }, { root: "3" }, { root: "b7", beats: 2 }, { type: "rest" }],
    });
  });

  it("R-00.7 tokens without :beats share what is left of the bar, partial rests included", () => {
    const json = toJSON(parse("## A\n1! x:3 | x:2 4 5 | 1:1 4 5"));
    const beats = json.sections[0]?.rows[0]?.bars.map((bar) =>
      bar.items.map((item) => ("beats" in item ? item.beats : 0)),
    );
    expect(beats).toEqual([
      [1, 3],
      [2, 1, 1],
      [1, 1.5, 1.5],
    ]);
  });

  it("R-00.7 the sixteenth push is a short push, the eighth push is a push", () => {
    const chords = bars("## A\n''4 '5 1").flatMap((bar) => bar.items);
    expect(
      chords.map((item) => (item.type === "chord" ? [item.push, item.shortPush === true] : null)),
    ).toEqual([
      [true, true],
      [true, false],
      [false, false],
    ]);
    const json = toJSON(parse("## A\n''4 '5 1"));
    expect(
      json.sections[0]?.rows[0]?.bars[0]?.items.map((item) => ("push" in item ? item.push : -1)),
    ).toEqual([2, 1, 0]);
  });

  it("R-00.7 riff notes show as numbers or letters, and move with the transposition", () => {
    const chart = parse("---\nkey: G\n---\n## A\nR[ 1 3 5 ]");
    const row = chart.sections[0]?.rows[0];
    const riff = row?.bars[0]?.items[0];
    if (riff?.type !== "riff" || row === undefined) throw new Error("expected a riff");
    const show = (style: "numbers" | "letters", key?: string) =>
      riff.notes.map((note) =>
        note.type === "note"
          ? chordFormatter(chart, {
              style,
              ...(key ? { key: { root: key, minor: false } } : {}),
            }).root(note.root, row)
          : "x",
      );
    expect(show("numbers")).toEqual(["1", "3", "5"]);
    expect(show("letters")).toEqual(["G", "B", "D"]);
    expect(show("letters", "A")).toEqual(["A", "C#", "E"]);
  });

  it("R-00.7 a riff note the parser cannot read is a warning and the rest of the riff is kept", () => {
    const chart = parse("## A\nR[ 1 Q 5 ]");
    expect(chart.warnings.map((warning) => warning.code)).toEqual(["riff-note"]);
    expect(chart.sections[0]?.rows[0]?.bars[0]?.items[0]).toMatchObject({
      notes: [{ root: "1" }, { root: "5" }],
    });
  });
});

describe("R-00.8 cues and notes for one pass, and repeat counts", () => {
  it("R-00.8 a cue or an MD note for one pass keeps its pass and its instruments", () => {
    const chart = parse(
      "## A\n> MD 2x bass: Walk up.\n> MD drums: Always.\n|: 1 {1x,3x drums: out} :| 3x",
    );
    expect(chart.sections[0]?.notes.map((note) => [note.roles, note.passes])).toEqual([
      [["bass"], [2]],
      [["drums"], []],
    ]);
    expect(chart.sections[0]?.rows[0]?.bars[0]?.cues).toEqual([
      { roles: ["drums"], passes: [1, 3], text: "out" },
    ]);
  });

  it("R-00.8 a note for one pass stays private to its instruments in the layer's text form", () => {
    const text = formatLayer({
      notes: [{ section: "A", occurrence: 1, roles: ["bass"], passes: [2], text: "Walk up." }],
    });
    expect(text).toContain("> MD 2x bass: Walk up.");
    expect(parseLayer(text).layer.notes[0]).toMatchObject({
      roles: ["bass"],
      passes: [2],
      text: "Walk up.",
    });
  });

  it("R-00.8 a repeat count is written :| 3x or :| x3, and means three passes in total", () => {
    const counts = bars("## A\n|: 1 :| 3x\n|: 4 :| x3\n|: 5 :|").map((bar) => bar.repeatEnd?.times);
    expect(counts).toEqual([3, 3, 2]);
  });

  it("R-00.8 a pass outside a repeat is a warning", () => {
    const codes = parse("## A\n> MD 2x drums: Crash.\n1 {2x: in}").warnings.map(
      (warning) => warning.code,
    );
    expect(codes).toEqual(["note-pass-without-repeat", "pass-without-repeat"]);
  });
});

describe("R-00.9 navigation and the play order", () => {
  it("R-00.9 repeats and endings expand into the bars as they are played", () => {
    const chart = parse("## A\n|: 1 | [1] 4 :| 2x\n[2] 5 | 6m");
    expect(playOrder(chart)).toEqual([
      step(0, 1),
      step(0, 2),
      step(0, 1, 2),
      step(0, 3, 2),
      step(0, 4, 2),
    ]);
  });

  it("R-00.9 D.S. al Coda jumps to the segno, then from the to-coda mark to the coda", () => {
    const chart = parse("## A\n{segno} 1 | 4 {to coda} | 5 {D.S. al coda}\n## B\n{coda} 6m | 1");
    expect(playOrder(chart)).toEqual([
      step(0, 1),
      step(0, 2),
      step(0, 3),
      step(0, 1, 1, true),
      step(0, 2),
      step(1, 1, 1, true),
      step(1, 2),
    ]);
  });

  it("R-00.9 D.C. al Fine goes back to the first bar and stops at the fine", () => {
    const chart = parse("## A\n1 | 4 {fine} | 5 {D.C. al fine} | 6m");
    expect(playOrder(chart)).toEqual([
      step(0, 1),
      step(0, 2),
      step(0, 3),
      step(0, 1, 1, true),
      step(0, 2),
    ]);
  });

  it("R-00.9 after the jump each repeat is played once, taking its last ending", () => {
    const chart = parse("## A\n|: {segno} 1 | [1] 4 :| 2x\n[2] 5 {D.S.}");
    expect(playOrder(chart).map((item) => [item.bar, item.pass])).toEqual([
      [1, 1],
      [2, 1],
      [1, 2],
      [3, 2], // the first time through, two passes
      [1, 2],
      [3, 2], // after the D.S.: the repeat once, on its last pass
    ]);
  });

  it("R-00.9 a jump with no target is a warning, and the chart plays as written", () => {
    const chart = parse("## A\n1 | 4 {D.S.} | 5");
    expect(chart.warnings.map((warning) => warning.code)).toEqual(["nav-needs-segno"]);
    expect(playOrder(chart).map((item) => item.bar)).toEqual([1, 2, 3]);
  });

  it("R-00.9 the play order of Northbound has every bar once, then the D.S. and the coda", () => {
    const order = playOrder(parse(fixture06("northbound")));
    expect(order[0]).toEqual(step(0, 0)); // the pickup
    expect(order.filter((item) => item.section === 4).map((item) => item.bar)).toEqual([
      1, 2, 3, 4,
    ]); // the outro, played once
    expect(order.length).toBe(57);
  });
});

describe("R-00.10 the JSON form of a chart", () => {
  const json = toJSON(
    parse(
      '---\nchartdown: 0.6\ntitle: Open Road\nkey: G\ntempo: 76\n---\n## Chorus\n> MD 2x drums: Add the crash.\n|: {segno} {mf} 4 {drums: in} "Take the open road" :| 2x',
    ),
  );

  it("R-00.10 has the top-level fields of the specification's Appendix A", () => {
    expect(Object.keys(json).sort()).toEqual(
      ["chartdown", "key", "meta", "minor", "playOrder", "sections", "warnings"].sort(),
    );
    expect(json).toMatchObject({
      chartdown: "0.6",
      meta: { title: "Open Road", key: "G", tempo: "76" },
      key: "G",
      minor: false,
    });
  });

  it("R-00.10 has the fields of a note, a row, a bar and a chord", () => {
    const section = json.sections[0];
    expect(section).toMatchObject({
      name: "Chorus",
      use: null,
      notes: [{ md: true, roles: ["drums"], passes: [2], text: "Add the crash." }],
    });
    const row = section?.rows[0];
    expect(row).toMatchObject({ key: "G", meter: "4/4", tempo: 76 });
    expect(row?.bars[0]).toEqual({
      number: 1,
      beats: 4,
      pickup: false,
      meter: null,
      repeatStart: true,
      repeatEnd: true,
      times: 2,
      ending: null,
      dynamic: "mf",
      tempoMark: null,
      nav: ["segno"],
      cues: [{ roles: ["drums"], passes: [], text: "in" }],
      lyric: "Take the open road",
      items: [
        {
          type: "chord",
          root: "4",
          degree: 5,
          quality: "",
          bass: null,
          bassDegree: null,
          beats: 4,
          push: 0,
          hold: false,
          stab: false,
          fermata: false,
        },
      ],
    });
  });

  it("R-00.10 carries the play order and every warning with its code and line", () => {
    expect(json.playOrder).toEqual([step(0, 1), step(0, 1, 2)]);
    expect(json.warnings).toEqual([]);
    const bad = toJSON(parse("## A\n1 ? 4"));
    expect(bad.warnings).toEqual([{ line: 2, code: "bad-token", message: "Can’t read “?”" }]);
  });

  it("R-00.10 the items are chords, rests, riffs, repeats and ties, with the beats they take", () => {
    const items = toJSON(
      parse("## A\nx | % | = | R[ 5:1 x:1 ]:2 1:2"),
    ).sections[0]?.rows[0]?.bars.map((bar) => bar.items[0]);
    expect(items?.map((item) => item?.type)).toEqual(["rest", "repeat", "tie", "riff"]);
    expect(items?.[3]).toEqual({
      type: "riff",
      beats: 2,
      notes: [
        { root: "5", degree: 7, beats: 1 },
        { rest: true, beats: 1 },
      ],
    });
  });
});
