import { chordFormatter, parse, type Row } from "chartdown";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarRow } from "./BarRow";
import { beatMarks, readBeatsMode, showBeats, type BeatsMode } from "./beatMarks";

const chartOf = (source: string) => parse(source);
const rowOf = (source: string, index = 0): Row => chartOf(source).sections[0]!.rows[index]!;
/** Whether the first bar of a chart's first row shows marks in a mode. */
const shows = (source: string, mode: BeatsMode, bar = 0, row = 0) => {
  const r = rowOf(source, row);
  return showBeats(r.bars[bar]!, r, mode, {
    firstAfterMeterChange: bar === 0 && r.meterChange !== undefined,
  });
};
const marks = (source: string, bar = 0, row = 0) => {
  const r = rowOf(source, row);
  return beatMarks(r.bars[bar]!, r).map((mark) => [mark.at, mark.strength]);
};
const html = (source: string, beats: BeatsMode, row = 0) => {
  const chart = chartOf(source);
  return renderToStaticMarkup(
    <BarRow
      row={chart.sections[0]!.rows[row]!}
      formatter={chordFormatter(chart, { style: "numbers" })}
      beats={beats}
    />,
  );
};
const slashes = (markup: string) => markup.match(/cd-chart__beat--(strong|semi|weak)/g) ?? [];

describe("R-03.7 the Beats control: which bars show marks", () => {
  it("R-03.7 the mode comes from the address or the browser, and Auto is the default", () => {
    expect(readBeatsMode("off")).toBe("off");
    expect(readBeatsMode("always")).toBe("always");
    expect(readBeatsMode("auto")).toBe("auto");
    expect(readBeatsMode(undefined)).toBe("auto");
    expect(readBeatsMode("sometimes")).toBe("auto");
  });

  it("R-03.7 Off shows no bar's marks, Always shows every bar's but a lone %", () => {
    const source = "## A\n1 | 1 4 | % | x | =";
    expect([0, 1, 2, 3, 4].map((bar) => shows(source, "off", bar))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect([0, 1, 2, 3, 4].map((bar) => shows(source, "always", bar))).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it.each([
    ["an explicit :beats", "## A\n1:3 4:1"],
    ["even explicit :beats", "## A\n1:2 4:2"],
    ["a chord off the beat in 4/4", "## A\n1 4 5"],
    ["a chord off the beat in 3/4", "---\nmeter: 3/4\n---\n## A\n1 4"],
    ["a push", "## A\n'4 5"],
    ["a short push", "## A\n''1"],
    ["a partial rest beside a chord", "## A\n1! x:3"],
    ["an x beside other tokens", "## A\n1 x"],
    ["a riff", "## A\nR[ 1 3 4 5 ]"],
    ["a pickup", "## A\n[p:2] 5 | 1"],
    ["a meter of its own", "## A\n1 | [m:2/4] 5"],
  ])("R-03.7 Auto shows marks for %s", (_name, source) => {
    const bar = source.includes("| [m:") ? 1 : 0;
    expect(shows(source, "auto", bar)).toBe(true);
  });

  it("R-03.7 Auto shows marks in the first bar after a meter change, and only there", () => {
    const source = "---\nmeter: 4/4\n---\n## A\n1 | 4\n@meter 6/8\n5 | 1";
    expect(shows(source, "auto", 0, 0)).toBe(false);
    expect(shows(source, "auto", 0, 1)).toBe(true);
    expect(shows(source, "auto", 1, 1)).toBe(false);
  });

  it.each([
    ["one chord for the whole bar", "## A\n1"],
    ["a hold", "## A\n<1>"],
    ["a fermata", "## A\n1~"],
    ["an even split on the beats", "## A\n1 4"],
    ["four chords, one a beat", "## A\n6m 5 4 1"],
    ["a split of 6/8 on its two big beats", "---\nmeter: 6/8\n---\n## A\n1 4"],
    ["only %", "## A\n1 | %"],
    ["only =", "## A\n1 | ="],
    ["only x", "## A\nx"],
  ])("R-03.7 Auto shows no marks for %s", (_name, source) => {
    const bar = source.includes("| ") ? 1 : 0;
    expect(shows(source, "auto", bar)).toBe(false);
  });
});

describe("R-03.7 the marks of each meter", () => {
  it("R-03.7 simple meters have a slash per beat, with the 3 of 4/4 semi-strong", () => {
    expect(marks("---\nmeter: 4/4\n---\n## A\n1")).toEqual([
      [0, "strong"],
      [1, "weak"],
      [2, "semi"],
      [3, "weak"],
    ]);
    expect(marks("---\nmeter: 3/4\n---\n## A\n1").map(([, strength]) => strength)).toEqual([
      "strong",
      "weak",
      "weak",
    ]);
    expect(marks("---\nmeter: 2/4\n---\n## A\n1")).toHaveLength(2);
  });

  it("R-03.7 compound meters have a slash per big beat, never six equal slashes", () => {
    expect(marks("---\nmeter: 6/8\n---\n## A\n1")).toEqual([
      [0, "strong"],
      [3, "semi"],
    ]);
    expect(marks("---\nmeter: 9/8\n---\n## A\n1").map(([at]) => at)).toEqual([0, 3, 6]);
    expect(marks("---\nmeter: 12/8\n---\n## A\n1").map(([at]) => at)).toEqual([0, 3, 6, 9]);
  });

  it("R-03.7 irregular meters have a slash per eighth, the 1 strong", () => {
    const five = marks("---\nmeter: 5/8\n---\n## A\n1");
    expect(five.map(([at]) => at)).toEqual([0, 1, 2, 3, 4]);
    expect(five.map(([, strength]) => strength)).toEqual([
      "strong",
      "weak",
      "weak",
      "weak",
      "weak",
    ]);
    expect(marks("---\nmeter: 7/8\n---\n## A\n1")).toHaveLength(7);
    expect(marks("---\nmeter: 3/8\n---\n## A\n1")).toHaveLength(3);
  });

  it("R-03.7 a pickup has only the marks in its own beats, the last ones of its meter", () => {
    expect(marks("## A\n[p:2] 5 | 1")).toEqual([
      [0, "semi"],
      [1, "weak"],
    ]);
    expect(marks("---\nmeter: 6/8\n---\n## A\n[p:3] 5 | 1 4")).toEqual([[0, "semi"]]);
  });

  it("R-03.7 a bar with a meter of its own is marked by that meter", () => {
    expect(marks("## A\n1 | [m:2/4] 5", 1).map(([at]) => at)).toEqual([0, 1]);
    expect(marks("---\nmeter: 4/4\n---\n## A\n[m:6/8] 5", 0).map(([at]) => at)).toEqual([0, 3]);
  });

  it("R-03.7 a change of meter changes the marks from its row on", () => {
    const source = "## A\n1\n@meter 6/8\n5";
    expect(marks(source, 0, 0)).toHaveLength(4);
    expect(marks(source, 0, 1)).toHaveLength(2);
  });
});

describe("R-03.7 how a bar is drawn with and without marks", () => {
  it("R-03.7 Off draws no beat line, and the row is compact", () => {
    const off = html("## A\n1 | 4 | 5 | 1", "off");
    expect(slashes(off)).toHaveLength(0);
    expect(off).toContain("cd-chart__bars--plain");
    expect(off).toContain("cd-chart__bar--plain");
  });

  it("R-03.7 Auto draws no beat line where no bar shows marks, and spreads the chords", () => {
    const auto = html("## A\n6m 5 4 1 | 1 4 | 5 | 1", "auto");
    expect(slashes(auto)).toHaveLength(0);
    expect(auto).toContain("cd-chart__spread");
    expect(auto).not.toContain("cd-chart__cell--split");
    expect(auto).not.toContain("cd-chart__grid");
  });

  it("R-03.7 Always draws the slashes of every bar, in the bar's own meter", () => {
    expect(slashes(html("## A\n1 | 4", "always"))).toHaveLength(8);
    const lantern = html("---\nmeter: 6/8\n---\n## A\n1 | 4", "always");
    expect(slashes(lantern)).toHaveLength(4);
  });

  it("R-03.7 a row with some bars with marks keeps one beat line, empty for the others", () => {
    const mixed = html("## A\n1 | 1:3 4:1 | 5", "auto");
    expect(slashes(mixed)).toHaveLength(4);
    // Every bar still has its four lines, so the chords share one baseline.
    expect(mixed).not.toContain("cd-chart__bars--plain");
    expect(mixed.match(/<div aria-hidden="true"><\/div>/g)).toHaveLength(2);
  });

  it("R-03.7 1:3 4:1 shows four slashes, and the 4 starts at the fourth", () => {
    const markup = html("## A\n1:3 4:1", "auto");
    expect(slashes(markup)).toHaveLength(4);
    expect(markup).toContain("grid-column:37 / span 12");
    expect(markup).toContain("cd-chart__cell--split");
  });

  it("R-03.7 a rest dims the slashes of the beats it covers, and the first one stays", () => {
    const markup = html("## A\n1! x:3", "auto");
    expect(markup.match(/cd-chart__beat--rest/g)).toHaveLength(3);
    expect(markup).toMatch(/cd-chart__beat cd-chart__beat--strong"/);
  });

  it("R-03.7 a pushed chord sits ahead of its slash, the slash stays on the beat", () => {
    const markup = html("## A\n'4 5 | ''1 4", "auto");
    expect(markup).toContain("cd-chart__chord--early");
    expect(markup.match(/cd-chart__chord--early-short/g)).toHaveLength(1);
    // The slash of the second beat is where it always is.
    expect(markup).toContain("grid-column:13 / span 12");
  });

  it("R-03.7 a pickup shows two slashes in its narrow bar", () => {
    const markup = html("## A\n[p:2] 5 | 1 | 4 | 5 | 1", "auto");
    expect(markup).toContain("cd-chart__bar--pickup");
    expect(markup.split('role="group"')[1]!.match(/cd-chart__beat--/g)).toHaveLength(2);
  });

  it("R-03.7 fractional chords start between slashes, at their exact place", () => {
    const markup = html("## A\n1:1.5 4:2.5", "auto");
    expect(slashes(markup)).toHaveLength(4);
    // The 4 starts at beat 1.5 of the bar: column 19, between the second and third slashes.
    expect(markup).toContain("grid-column:19 / span 30");
  });

  it("R-03.7 the slashes and dimmed slashes are hidden from screen readers", () => {
    const markup = html("## A\n1! x:3", "auto");
    expect(markup).toMatch(
      /<div class="cd-chart__grid" style="[^"]*" aria-hidden="true"><span class="cd-chart__beat/,
    );
  });
});
