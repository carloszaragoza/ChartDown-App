import { chordFormatter, parse, type Chart } from "chartdown";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarRow } from "./BarRow";

const render = (chart: Chart, style: "numbers" | "letters") =>
  chart.sections.flatMap((section) =>
    section.rows.map((row) =>
      renderToStaticMarkup(<BarRow row={row} formatter={chordFormatter(chart, { style })} />),
    ),
  );
// The chords of a row as drawn: each root with its quality as a superscript.
const chords = (html: string) =>
  [
    ...html.matchAll(/cd-chart__chord">([^<]*)(?:<sup class="cd-chart__quality">([^<]*)<\/sup>)?/g),
  ].map(([, root, quality]) => `${root}${quality ? `^${quality}` : ""}`);

describe("R-00.11 R-00.13 the viewer draws ChartDown 0.7", () => {
  it("R-00.13 qualities written with aliases are drawn in their canonical spelling", () => {
    const chart = parse("## A\n7ø | 1Δ | 4sus4 | 2-7");
    expect(chords(render(chart, "numbers")[0] as string)).toEqual([
      "7^-7b5",
      "1^maj7",
      "4^sus",
      "2^-7",
    ]);
    expect(chords(render(chart, "letters")[0] as string)).toEqual([
      "B^m7b5",
      "C^maj7",
      "F^sus",
      "D^m7",
    ]);
  });

  it("R-00.14 a chart with numbering: 6m draws the same letters as its 1m version", () => {
    const six = parse("---\nkey: Em\nnumbering: 6m\n---\n## A\n6m | 1 | 4 | 37");
    const one = parse("---\nkey: Em\n---\n## A\n1m | b3 | b6 | 57");
    expect(render(six, "letters").map(chords)).toEqual(render(one, "letters").map(chords));
    // In numbers, each draws its numbers as written.
    expect(chords(render(six, "numbers")[0] as string)).toEqual(["6^-", "1", "4", "3^7"]);
  });
});
