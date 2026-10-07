import { chordFormatter, parse } from "chartdown";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarRow } from "./BarRow";
import { MDNotes } from "./MDNotes";

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (html: string) =>
  html
    .replace(/<span class="cd-visually-hidden">[^<]*<\/span>/g, "")
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
    expect(html).toContain("<i>mf</i>");
  });

  it("T-1301 shows letters in another key from the same tree", () => {
    const letters = chordFormatter(chart, { style: "letters", key: { root: "A", minor: false } });
    expect(text(render(<BarRow row={row} formatter={letters} />))).toBe("mf D A E/G# F# m");
  });

  it("T-1301 the small size is the next-section preview, in the secondary color", () => {
    const html = render(
      <BarRow row={row} formatter={chordFormatter(chart, { style: "numbers" })} size="sm" />,
    );
    expect(html).toContain("var(--color-border-emphasized)");
    expect(html).not.toContain("var(--color-text-primary)");
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
