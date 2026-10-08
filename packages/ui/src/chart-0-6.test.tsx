import { chordFormatter, parse, type Chart } from "chartdown";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarRow } from "./BarRow";
import { hasPickup } from "./beats";
import { MDNotes } from "./MDNotes";

const render = (chart: Chart, rowIndex = 0, style: "numbers" | "letters" = "numbers") =>
  renderToStaticMarkup(
    <BarRow
      row={chart.sections[0]!.rows[rowIndex]!}
      formatter={chordFormatter(chart, { style })}
    />,
  );
const words = (html: string) =>
  html
    .replace(/<div[^>]*aria-hidden="true">.*?<\/div>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const name = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

describe("R-00.11 the viewer draws ChartDown 0.5 and 0.6", () => {
  it("R-00.11 a pickup is a narrow bar with only its own beats", () => {
    const chart = parse("## Intro\n[p:2] 5 | 1 | 4 | 5 | 1");
    const html = render(chart);
    expect(html).toContain("cd-chart__bar--pickup");
    // Two beats of four: half a bar, in a row of unequal columns.
    expect(html).toMatch(
      /--chart-bar-columns:minmax\(calc\(var\(--chart-bar-min-width\) \* 0\.5\), 0\.5fr\) minmax/,
    );
    // The pickup's slashes are the last two beats of the meter: semi-strong, then weak.
    const pickup = html.split('role="group"')[1] ?? "";
    expect(pickup.match(/cd-chart__beat--/g)).toHaveLength(2);
    expect(pickup).toMatch(/cd-chart__beat--semi[\s\S]*cd-chart__beat--weak/);
    expect(hasPickup(chart.sections[0]!)).toBe(true);
    expect(hasPickup(parse("## A\n1 | 4").sections[0]!)).toBe(false);
  });

  it("R-00.11 a pickup is never narrower than a third of a bar", () => {
    const html = render(parse("---\nmeter: 4/4\n---\n## A\n[p:0.5] 5 | 1 | 4 | 5"));
    expect(html).toMatch(/minmax\(calc\(var\(--chart-bar-min-width\) \* 0\.3\), 0\.3fr\)/);
  });

  it("R-00.11 a unison riff is its notes on one line, read out as a riff, in numbers and letters", () => {
    const chart = parse("---\nkey: G\n---\n## A\nR[ 1 3 5 x ] | 1");
    const numbers = render(chart);
    expect(numbers).toContain("cd-chart__riff");
    expect(numbers).toContain('aria-label="unison riff"');
    expect(words(numbers)).toBe("1 3 5 x 1");
    expect(numbers).toContain("cd-chart__riff-rest");
    expect(words(render(chart, 0, "letters"))).toBe("G B D x G");
  });

  it("R-00.11 a riff note with :beats takes its share of the riff's line", () => {
    const html = render(parse("## A\nR[ 5:1 b7:1 x:2 ]"));
    expect(html).toContain("flex:1 1 0");
    expect(html).toContain("flex:2 1 0");
  });

  it("R-00.11 a partial rest takes only its beats, and a short push is drawn and read out", () => {
    const html = render(parse("## A\n1! x:3 | ''4 5"));
    expect(words(html)).toContain("N.C.");
    expect(html).toContain("grid-column:13 / span 36");
    expect(html).toContain("‹‹");
    expect(html).toContain("short push");
    expect(render(parse("## A\n'4")).includes("‹‹")).toBe(false);
  });

  it("R-00.11 a meter for one bar, tempo marks and navigation marks are in the tags line", () => {
    const html = render(
      parse("## A\n{segno} 1 {rit} | [m:2/4] 5 {to coda} | 4 {a tempo} | 5 {D.S. al coda}"),
    );
    const text = words(html);
    expect(text).toContain("Segno");
    expect(text).toContain("rit.");
    expect(text).toContain("2/4");
    expect(text).toContain("To Coda");
    expect(text).toContain("a tempo");
    expect(text).toContain("D.S. al Coda");
    // The 2/4 bar has two slashes, not four.
    const second = html.split('role="group"')[2] ?? "";
    expect(second.match(/cd-chart__beat--/g)).toHaveLength(2);
  });

  it("R-00.11 a meter or tempo change is a line above its row, in words", () => {
    const chart = parse("---\nmeter: 4/4\n---\n## A\n1 | 4\n@meter 6/8\n@tempo 72\n5 | 1");
    expect(words(render(chart, 0))).not.toContain("Meter");
    expect(words(render(chart, 1))).toContain("Meter: 6/8 · Tempo: 72 bpm");
    // The row is drawn in its own meter: two big beats a bar, so four slashes for two bars.
    expect(render(chart, 1).match(/cd-chart__beat--/g)).toHaveLength(4);
  });

  it("R-00.11 a cue for one pass says which pass, before who it is for", () => {
    const chart = parse("## A\n|: 1 {2x drums: in} | 4 {1x,3x: stop} :| 3x");
    const text = words(render(chart));
    expect(text).toContain("2x Drums in");
    expect(text).toContain("1x,3x stop");
  });

  it("R-00.11 an MD note for one pass has a 2x token before who it is for", () => {
    const html = renderToStaticMarkup(
      <MDNotes
        notes={[
          { md: true, roles: ["drums"], passes: [2], text: "Ride cymbal." },
          { md: true, roles: ["everyone"], text: "Open it up." },
        ]}
        instrumentName={name}
      />,
    );
    const text = words(html);
    expect(text).toContain("2x Drums Ride cymbal.");
    expect(text).toContain("MD Open it up.");
    expect(text).not.toContain("2x MD");
  });
});
