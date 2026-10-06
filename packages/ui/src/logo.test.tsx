import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartDownLogo } from "./ChartDownLogo";

const cue = "var(--chartdown-cue, #B8322A)";

describe("T-901 the ChartDown logo (concept 3C, One bar)", () => {
  it("T-901 the horizontal logo is one bar and the name, read as ChartDown", () => {
    const html = renderToString(<ChartDownLogo />);
    expect(html).toMatch(/role="img"/);
    expect(html).toContain('aria-label="ChartDown"');
    expect(html).toContain('class="cd-logo"');
    // Two bar lines and four slashes.
    expect(html.match(/<rect /g)).toHaveLength(2);
    expect(html.match(/<line /g)).toHaveLength(4);
  });

  it("T-901 only the first slash is in red pencil, and one color has no red at all", () => {
    const strokes = (html: string) =>
      [...html.matchAll(/<line [^>]*stroke="([^"]+)"/g)].map((match) => match[1]);
    expect(strokes(renderToString(<ChartDownLogo variant="symbol" size={48} />))).toEqual([
      cue,
      "var(--chartdown-ink, currentColor)",
      "var(--chartdown-ink, currentColor)",
      "var(--chartdown-ink, currentColor)",
    ]);
    expect(
      strokes(renderToString(<ChartDownLogo variant="symbol" size={48} mono />)),
    ).not.toContain(cue);
  });

  it("T-901 at 24 px and below the symbol has two beats", () => {
    const small = renderToString(<ChartDownLogo variant="symbol" size={24} />);
    expect(small.match(/<line /g)).toHaveLength(2);
    expect(renderToString(<ChartDownLogo app />)).toContain('aria-label="ChartDown App"');
  });
});
