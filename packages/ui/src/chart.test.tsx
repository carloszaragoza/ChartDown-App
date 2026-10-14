import {
  chordFormatter,
  parse,
  parseLayer,
  placeLayer,
  type Chart,
  type DisplayOptions,
} from "chartdown";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Bar, BarRow, DEFAULT_BAR_LABELS } from "./Bar";
import { abbreviate, FormStrip, formStripItems, type FormStripItem } from "./FormStrip";
import { MDNote, orderNotes } from "./MDNote";
import { NextSection, Section, type SectionLabels } from "./Section";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("./components.css");
const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (html: string) =>
  html.replace(/<span class="cd-visually-hidden">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");

const labels: SectionLabels = {
  length: ({ perPass, times }) => `${perPass} bars${times > 1 ? ` ×${times}` : ""}`,
  next: "Next",
  notesForYou: "notes for you",
  bar: DEFAULT_BAR_LABELS,
};
const describeChip = (item: FormStripItem) =>
  [
    item.name,
    item.state === "played" ? "played" : item.state === "current" ? "now" : "",
    item.hasNotes ? "has notes for you" : "",
  ]
    .filter(Boolean)
    .join(", ");

// The approved "Atril" screen: Open Road in A, Chorus 2 now, viewed as Keys, with a Keys layer note.
const openRoad = parse(read("../../../fixtures/open-road.chartdown"));
const layer = parseLayer(
  "## Chorus 2\n> MD keys: Move the pad up an octave. Right hand stays simple.",
).layer;
const placement = placeLayer(openRoad, layer);
const inA: DisplayOptions = { style: "numbers", key: { root: "A", minor: false } };
const forKeys = (index: number) => [
  ...(openRoad.sections[index]?.notes ?? []).filter(
    (n) => n.roles.includes("everyone") || n.roles.includes("keys"),
  ),
  ...(placement.sections[index] ?? []).map((p) => ({ md: true, ...p.note })),
];
const keysNotes = (index: number) => forKeys(index).some((n) => n.roles.includes("keys"));

/** Every row of a rendered section as "chord chord | chord", as a musician reads it. */
function rows(html: string): string[] {
  return Array.from(
    html.matchAll(
      /<div class="cd-row[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>(?=<div class="cd-row|<\/section>|<\/div>$|$)/g,
    ),
    ([row = ""]) =>
      Array.from(row.matchAll(/<div class="cd-bar__chords">(.*?)<\/div>/g), ([, bar = ""]) =>
        Array.from(
          bar.matchAll(
            /<span class="cd-chord[^"]*"[^>]*>(.*?)<\/span>(?=<span class="cd-chord|$)/g,
          ),
          ([, chord = ""]) => text(chord),
        ).join(" "),
      ).join(" | "),
  );
}

describe("Handoff 3 the example chart (Atril screen)", () => {
  it("the song map shows the design's abbreviations and lengths, with Chorus 2 now", () => {
    const items = formStripItems(openRoad, 4, keysNotes);
    expect(
      items.map(
        (i) =>
          `${i.abbreviation} ${i.length.times > 1 ? `${i.length.perPass}×${i.length.times}` : i.length.perPass}`,
      ),
    ).toEqual(["I 4", "V1 8", "C 8", "V2 8", "C2 8", "B 4×2", "LC 8"]);
    expect(items.map((i) => i.state)).toEqual([
      "played",
      "played",
      "played",
      "played",
      "current",
      "upcoming",
      "upcoming",
    ]);
  });

  it("Chorus 2 in A, as numbers: the MD notes come first, then its two rows", () => {
    const html = render(
      <Section
        section={openRoad.sections[4] as Chart["sections"][number]}
        formatter={chordFormatter(openRoad, inA)}
        labels={labels}
        notes={forKeys(4)}
      />,
    );
    expect(html).toMatch(/^<section class="cd-section" aria-label="Chorus 2">/);
    expect(html).toContain(
      '<h2 class="cd-section__title">Chorus 2</h2><span class="cd-section__length">8 bars</span>',
    );
    expect(html.indexOf("cd-note")).toBeLessThan(html.indexOf("cd-row"));
    expect(html).toContain(
      '<span class="cd-note__md">MD</span><span class="cd-note__text">A touch bigger. Harmonies on the second line.</span>',
    );
    expect(html).toMatch(
      /<span class="cd-tag"><svg[^>]*>.*?<\/svg>Keys<\/span><span class="cd-note__text">Move the pad up an octave/,
    );
    expect(rows(html)).toEqual(["4 | 1 | 5 | 6-", "4 | 1 | 5sus 5 | 1"]);
    expect(html).toContain('6<span class="cd-chord__minor">-</span>');
    expect(html).toContain('<span class="cd-bar__dynamic">mf</span>');
  });

  it("the next section is a quiet preview of its first row", () => {
    const html = render(
      <NextSection
        section={openRoad.sections[5] as Chart["sections"][number]}
        formatter={chordFormatter(openRoad, inA)}
        labels={labels}
      />,
    );
    expect(text(html)).toMatch(/^Next: Bridge · 4 bars ×2/);
    expect(html.match(/class="cd-row /g)).toHaveLength(1);
    expect(html).toContain('class="cd-row cd-row--sm"');
    expect(html).toContain('class="cd-bar cd-bar--sm cd-bar--repeat-start"');
  });
});

describe("Handoff 3 Bar", () => {
  const chart = parse(
    '---\ninstruments: cello\n---\n## A\n{p} 1:3 \'4:1 {watch me} {drums: in} | <1>~ | 5! "Take the open road" | x % = | [1] 6m 5 :| x3',
  );
  const row = chart.sections[0]?.rows[0];
  if (!row) throw new Error("no row");
  const numbers = chordFormatter(chart, { style: "numbers" });
  const bar = (index: number) =>
    render(
      <Bar bar={row.bars[index] as (typeof row.bars)[number]} row={row} formatter={numbers} />,
    );

  it("chords share the bar by beats", () => {
    expect(bar(0)).toMatch(
      /<span class="cd-chord" style="flex-grow:3">1<\/span><span class="cd-chord" style="flex-grow:1">/,
    );
  });

  it("puts the dynamic top-left and the cues beside it, instrument cues led by their name", () => {
    expect(bar(0)).toContain(
      '<div class="cd-bar__top"><span class="cd-bar__dynamic">p</span><span class="cd-bar__cue">watch me</span><span class="cd-bar__cue"><span class="cd-bar__cue-instrument">Drums</span>in</span></div>',
    );
  });

  it("draws push, hold, stab and fermata in the blue pencil and says them in words", () => {
    expect(bar(0)).toContain(
      '<span class="cd-chord__push" aria-hidden="true">‹</span>4<span class="cd-visually-hidden"> (push)</span>',
    );
    expect(bar(1)).toContain('class="cd-chord cd-chord--hold"');
    expect(bar(1)).toContain(
      '<span class="cd-chord__mark" aria-hidden="true">⌒</span>1<span class="cd-visually-hidden"> (hold, fermata)</span>',
    );
    expect(bar(2)).toContain('<span class="cd-chord__mark" aria-hidden="true">^</span>5');
    for (const selector of [
      ".cd-chord__push",
      ".cd-chord__mark",
      ".cd-chord--hold::before",
      ".cd-bar__dynamic",
    ]) {
      expect(
        css.slice(css.indexOf(`${selector} {`), css.indexOf("}", css.indexOf(`${selector} {`))),
      ).toContain("var(--dynamic)");
    }
  });

  it("shows the lyric landmark at the bottom, in quotes", () => {
    expect(bar(2)).toContain('<div class="cd-bar__lyric">“Take the open road”</div>');
  });

  it("shows no chord, repeat bar and tie, and says them in words", () => {
    expect(bar(3)).toContain(
      '<span aria-hidden="true">N.C.</span><span class="cd-visually-hidden">no chord</span>',
    );
    expect(bar(3)).toContain(
      '<span aria-hidden="true">%</span><span class="cd-visually-hidden">repeat the previous bar</span>',
    );
    expect(bar(3)).toContain(
      '<span aria-hidden="true">⁀</span><span class="cd-visually-hidden">tied over</span>',
    );
  });

  it("marks endings and repeats", () => {
    expect(bar(4)).toMatch(/^<div class="cd-bar cd-bar--xl cd-bar--repeat-end cd-bar--ending">/);
    expect(bar(4)).toContain('<span class="cd-bar__ending">1.</span>');
    expect(bar(4)).toContain('<span class="cd-bar__times">×3</span>');
  });

  it("shows letters when asked, and keeps bars square with ink lines", () => {
    const letters = chordFormatter(parse("---\nkey: D\n---\n## A\n6m 5/7"), { style: "letters" });
    const lettersChart = parse("---\nkey: D\n---\n## A\n6m 5/7");
    const lettersRow = lettersChart.sections[0]?.rows[0];
    if (!lettersRow) throw new Error("no row");
    expect(text(render(<BarRow row={lettersRow} formatter={letters} />))).toBe("BmA/C#");
    expect(css).toContain("border-radius: var(--radius-none)");
    expect(
      css.slice(css.indexOf(".cd-bar {"), css.indexOf("}", css.indexOf(".cd-bar {"))),
    ).toContain("border-right: var(--stroke-bar-line) solid var(--ink)");
  });

  it("keeps a four-column grid for short rows and widens it for long ones", () => {
    const short = parse("## A\n1 | 4").sections[0]?.rows[0];
    const long = parse("## A\n1 | 4 | 5 | 1 | 6m").sections[0]?.rows[0];
    if (!short || !long) throw new Error("no rows");
    expect(render(<BarRow row={short} formatter={numbers} />)).toContain(
      "grid-template-columns:repeat(4, minmax(0, 1fr))",
    );
    expect(render(<BarRow row={long} formatter={numbers} />)).toContain(
      "grid-template-columns:repeat(5, minmax(0, 1fr))",
    );
  });
});

describe("Handoff 3 MDNote", () => {
  const instrumentName = (id: string) => ({ bass: "Bass", keys: "Keys" })[id] ?? id;

  it("labels a note for everyone with MD, a note for instruments with their tags, and keeps plain notes muted", () => {
    expect(
      render(
        <MDNote
          note={{ md: true, roles: ["everyone"], text: "Open it up." }}
          instrumentName={instrumentName}
        />,
      ),
    ).toBe(
      '<p class="cd-note"><span class="cd-note__md">MD</span><span class="cd-note__text">Open it up.</span></p>',
    );
    const both = render(
      <MDNote
        note={{ md: true, roles: ["bass", "keys"], text: "Roots only." }}
        instrumentName={instrumentName}
      />,
    );
    expect(both.match(/class="cd-tag"/g)).toHaveLength(2);
    expect(text(both)).toBe("BassKeysRoots only.");
    expect(
      render(
        <MDNote
          note={{ md: false, roles: ["everyone"], text: "Chords share a bar." }}
          instrumentName={instrumentName}
        />,
      ),
    ).toBe('<p class="cd-note cd-note--plain">Chords share a bar.</p>');
  });

  it("orders everyone's notes first, then instrument notes, then plain notes", () => {
    const notes = [
      { md: false, roles: ["everyone"], text: "plain" },
      { md: true, roles: ["keys"], text: "keys" },
      { md: true, roles: ["everyone"], text: "all" },
      { md: true, roles: ["bass"], text: "bass" },
    ];
    expect(orderNotes(notes).map((n) => n.text)).toEqual(["all", "keys", "bass", "plain"]);
  });

  it("never draws a note with a colored border or box", () => {
    for (const selector of [".cd-note {", ".cd-note__md {", ".cd-note--plain {"]) {
      const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));
      expect(rule).not.toMatch(/border|background/);
    }
  });
});

describe("Handoff 3 FormStrip", () => {
  it("abbreviates sections as the Handoff lists them, custom names by their initials", () => {
    const names = [
      "Intro",
      "Verse 1",
      "Verse",
      "Pre-chorus",
      "Chorus",
      "Chorus 2",
      "Bridge",
      "Instrumental",
      "Tag",
      "Last Chorus",
      "Outro",
      "Big Ending",
      "Coro",
    ];
    expect(names.map(abbreviate)).toEqual([
      "I",
      "V1",
      "V",
      "PC",
      "C",
      "C2",
      "B",
      "Inst",
      "T",
      "LC",
      "O",
      "BE",
      "C",
    ]);
  });

  it("numbers a section name used again without its own number", () => {
    const chart = parse("## Chorus\n1\n## Verse\n4\n## Chorus\n1");
    expect(formStripItems(chart, 0, () => false).map((i) => i.abbreviation)).toEqual([
      "C",
      "V",
      "C2",
    ]);
  });

  it("is an ordered list of links: the current one is marked, notes are a dot and words", () => {
    const html = render(
      <FormStrip
        items={formStripItems(openRoad, 4, keysNotes)}
        labels={{ nav: "Song form", describe: describeChip }}
      />,
    );
    expect(html).toMatch(
      /^<nav class="cd-form" aria-label="Song form"><ol class="cd-form__list"><li><a /,
    );
    expect(html.match(/<li>/g)).toHaveLength(7);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(
      /class="cd-form__chip cd-form__chip--current" href="#section-5" title="Chorus 2, now, has notes for you" aria-current="true"><span class="cd-form__dot" aria-hidden="true"><\/span>/,
    );
    expect(html).toContain(
      '<span class="cd-visually-hidden">Intro, played, has notes for you</span>',
    );
    expect(html).toContain('<span class="cd-form__length" aria-hidden="true">4×2</span>');
  });

  it("chips are at least 44 px and wrap instead of scrolling sideways", () => {
    const chip = css.slice(
      css.indexOf(".cd-form__chip {"),
      css.indexOf("}", css.indexOf(".cd-form__chip {")),
    );
    expect(chip).toContain("min-height: var(--target-min)");
    expect(chip).toContain("min-width: var(--target-min)");
    expect(css).toContain("flex-wrap: wrap");
    expect(css).not.toMatch(/overflow-x/);
  });
});

describe("Handoff 2 chart styles use tokens only", () => {
  it("has no raw colors, and pixel values only where screen-reader text needs them", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    const withoutHiddenText = css.replace(/\.cd-visually-hidden \{[^}]*\}/, "");
    expect(withoutHiddenText).not.toMatch(/\d+px/);
  });
});
