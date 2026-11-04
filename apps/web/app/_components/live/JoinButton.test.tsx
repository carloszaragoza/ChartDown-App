import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JoinButton } from "./JoinButton";

const css = (name: string) =>
  readFileSync(new URL(`../../../theme/${name}`, import.meta.url), "utf8");
// The theme's rules for Join: the first as on a computer, the second in its touch-screen block.
const joinRules = (text: string) =>
  [...text.matchAll(/\[data-variant="join"\]\s*\{([^}]*)\}/g)].map((match) => match[1] ?? "");

describe("R-12.2 T-3046 Join calls the musician in on a touch screen", () => {
  it("R-12.2 Join is the theme's join button, with its word", () => {
    const html = renderToString(<JoinButton label="Join" href="/sets/1/live" />);
    expect(html).toContain('data-variant="join"');
    expect(html).toContain(">Join<");
  });

  it("R-12.2 a computer keeps the primary fill; a touch screen fills it in the MD's Rosewood", () => {
    for (const theme of ["chartdown.css", "chartdown-stand.css"]) {
      const text = css(theme);
      const [computer, touch] = joinRules(text);
      expect(computer).toContain("var(--color-accent)");
      expect(touch).toContain("var(--color-icon-red)");
      // The Rosewood rule lives in the touch-screen block.
      const touchBlock = text.slice(text.indexOf("(pointer: coarse)"));
      expect(touchBlock).toContain('[data-variant="join"]');
    }
  });
});
