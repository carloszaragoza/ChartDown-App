import { chordFormatter, parse } from "chartdown";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarRow } from "./BarRow";
import { MDNotes } from "./MDNotes";

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (html: string) =>
  html
    .replace(/<span class="cd-visually-hidden">[^<]*<\/span>/g, "")
    // The beat slashes are hidden from screen readers, so they are not read either.
    .replace(/<div[^>]*aria-hidden="true">.*?<\/div>/g, "")
    .replace(/<span class="cd-chart__bass">/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const chart = parse("---\nkey: G\n---\n## Chorus\n{mf} 4 | 1 | 5/7 | 6m\n");
const row = chart.sections[0]!.rows[0]!;
const name = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

describe("T-1301 BarRow, the Astryx chart row", () => {
  it("T-1301 draws the chartdown tree: four bars, numbers, slash bass and the dynamic", () => {
    const html = render(
      <BarRow row={row} formatter={chordFormatter(chart, { style: "numbers" })} />,
    );
    expect(html.match(/role="group"/g)).toHaveLength(4);
    expect(text(html)).toBe("mf 4 1 5/7 6 -");
    // The minor mark is a superscript; the dynamic is in italics.
    expect(html).toMatch(/<sup[^>]*>-<\/sup>/);
    expect(html).toMatch(/<i[^>]*>mf<\/i>/);
  });

  it("T-1301 a bar's marks (×2, a dynamic) never push its chords off the row's line", () => {
    const repeat = parse("## Verse 1\n|: 1 | 4 1 | 6m7b5 5 | 4sus4 1Maj7 :| x2\n");
    const html = render(
      <BarRow
        row={repeat.sections[0]!.rows[0]!}
        formatter={chordFormatter(repeat, { style: "numbers" })}
      />,
    );
    expect(text(html)).toContain("×2");
    // Every bar has the row's four shared lines (tags, chords, beats, lyric), even when empty;
    // chart.css makes each bar a subgrid over them.
    const bars = html.split('role="group"').slice(1);
    expect(bars).toHaveLength(4);
    for (const bar of bars) {
      for (const line of ["cd-chart__tags", "cd-chart__grid", "cd-chart__lyric"]) {
        expect(bar).toContain(line);
      }
    }
  });

  it("T-1301 shows letters in another key from the same tree", () => {
    const letters = chordFormatter(chart, { style: "letters", key: { root: "A", minor: false } });
    expect(text(render(<BarRow row={row} formatter={letters} />))).toBe("mf D A E/G# F# m");
  });

  it("T-1301 the small size is the next-section preview, in the secondary color", () => {
    const html = render(
      <BarRow row={row} formatter={chordFormatter(chart, { style: "numbers" })} size="sm" />,
    );
    expect(html).toContain("cd-chart--sm");
    // chart.css draws the small size in the secondary color, with thinner, lighter bar lines.
    const css = readFileSync(join(__dirname, "chart.css"), "utf8");
    const small = /\.cd-chart--sm \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(small).toContain("--chart-ink: var(--color-text-secondary)");
    expect(small).toContain("var(--color-border-emphasized)");
  });
});

// The chart viewer rules (T-1309, design/chart-viewer/CHART-VIEWER.md), checked on the markup.
const draw = (source: string, style: "numbers" | "letters" = "numbers") => {
  const parsed = parse(source);
  const formatter = chordFormatter(parsed, { style });
  return parsed.sections[0]!.rows.map((r) =>
    render(<BarRow row={r} formatter={formatter} meter={parsed.meter} />),
  );
};
const cells = (html: string) =>
  [...html.matchAll(/class="cd-chart__cell[^"]*" style="grid-column:(\d+) \/ span (\d+)"/g)].map(
    (m) => [Number(m[1]), Number(m[2])],
  );
const slashes = (html: string) =>
  [...html.matchAll(/cd-chart__beat--(strong|semi|weak)/g)].map((m) => m[1]);

describe("T-1309 the chart viewer", () => {
  it("T-1309 4:2 4:1 5:1 in 4/4: the second 4 starts at the third slash, with no beats text", () => {
    const [html] = draw("---\nmeter: 4/4\n---\n## A\n4:2 4:1 5:1\n");
    // 12 columns per beat: beats 1–2, beat 3, beat 4.
    expect(cells(html!)).toEqual([
      [1, 24],
      [25, 12],
      [37, 12],
    ]);
    expect(text(html!)).not.toMatch(/beat/i);
    // A dashed line marks each change inside the bar.
    expect(html!.match(/cd-chart__cell--split/g)).toHaveLength(2);
  });

  it("T-1309 chords without :beats share what the others leave", () => {
    const [html] = draw("## A\n6m:1.5 5 4\n");
    expect(cells(html!)).toEqual([
      [1, 18],
      [19, 15],
      [34, 15],
    ]);
  });

  it("T-1309 a 4/4 bar shows strong, weak, semi-strong, weak; a 3/4 bar one strong and two weak", () => {
    expect(slashes(draw("## A\n1\n")[0]!)).toEqual(["strong", "weak", "semi", "weak"]);
    expect(slashes(draw("---\nmeter: 3/4\n---\n## A\n1\n")[0]!)).toEqual([
      "strong",
      "weak",
      "weak",
    ]);
  });

  it("T-1309 a 6/8 bar shows its two big beats, strong on 1 and semi-strong on 4 (R-03.7)", () => {
    expect(slashes(draw("---\nmeter: 6/8\n---\n## A\n1\n")[0]!)).toEqual(["strong", "semi"]);
  });

  it("T-1309 the beat slashes are hidden from screen readers and each has a title", () => {
    const [html] = draw("## A\n1\n");
    expect(html).toMatch(/<div class="cd-chart__grid" style="[^"]*" aria-hidden="true">/);
    expect(html).toContain('title="Beat 3: semi-strong"');
  });

  it("T-1309 marks: push, hold in its diamond, stab, fermata, N.C., % and the tie", () => {
    const [html] = draw("## A\n'4 <5> | 1! 1~ | x % | =\n");
    expect(html).toContain("cd-chart__push");
    expect(html).toMatch(/<span class="cd-chart__hold">5<\/span>/);
    expect(html).toMatch(/cd-chart__marks[^>]*><span>\^<\/span>/);
    expect(html).toContain("𝄐");
    expect(text(html!)).toContain("N.C.");
    expect(text(html!)).toContain("%");
    expect(text(html!)).toContain("⁀");
    // Each mark is also said in words.
    expect(html).toContain("(push)");
    expect(html).toContain("(hold)");
  });

  it("T-1309 repeats draw double bar lines; endings a label and a top line; ×N on the last bar", () => {
    const [first, second] = draw("## Bridge\n|: 6m | 4 | 1 | [1] 5 :| x2\n[2] 5:2 4:1 5:1 |\n");
    expect(first).toContain("cd-chart__bar--repeat-start");
    expect(first).toContain("cd-chart__bar--repeat-end");
    expect(first).toMatch(/cd-chart__ending">1\.</);
    expect(first).toMatch(/cd-chart__times">×2</);
    expect(second).toContain("cd-chart__bar--ending");
    expect(second).toMatch(/cd-chart__ending">2\.</);
  });

  it("T-1309 a key change has its own line above the row, in the shown key", () => {
    const rows = draw("---\nkey: G\n---\n## Last Chorus\n4 | 1\n@key A\n4 | 1\n", "letters");
    expect(rows[0]).not.toContain("cd-chart__key-change");
    expect(rows[1]).toMatch(/cd-chart__key-change">Key change: A</);
  });

  it("T-1309 a lyric landmark sits under the beats, and cues name their instrument", () => {
    const [html] = draw('## Build\n{p} 1 "Morning on the road" | {cresc} 4 {drums: in}\n');
    expect(html).toMatch(/cd-chart__lyric">“Morning on the road”</);
    expect(html).toMatch(/cd-chart__cue-role">Drums </);
    expect(text(html!)).toContain("cresc.");
  });

  it("T-1309 the chart's tokens are Astryx theme tokens, declared on the chart itself", () => {
    const css = readFileSync(join(__dirname, "chart.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/:root/);
    expect(css).toContain("--chart-ink: var(--color-text-primary)");
  });
});

describe("T-1301 MDNotes", () => {
  it("R-06.1 a note for everyone says MD; an instrument's note says the instrument; never color alone", () => {
    const html = render(
      <MDNotes
        instrumentName={name}
        notes={[
          { md: true, roles: ["drums"], text: "Light groove." },
          { md: true, roles: [], text: "Open it up." },
          { md: false, roles: [], text: "A plain note." },
        ]}
      />,
    );
    // Everyone's notes first, then instruments, then plain notes.
    expect(text(html)).toBe("MD Open it up. Drums Light groove. A plain note.");
    expect(html).toMatch(/<svg class="cd-icon"/);
  });
});
