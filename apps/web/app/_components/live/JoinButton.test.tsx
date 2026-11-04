import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JoinButton } from "./JoinButton";

let touch = false;
vi.mock("../../../lib/shell/phone", () => ({ useTouchScreen: () => touch }));

describe("R-12.2 T-3046 Join calls the musician in on a touch screen", () => {
  it("R-12.2 on a touch screen Join is filled in the MD's Rosewood, with its word", () => {
    touch = true;
    const html = renderToString(<JoinButton label="Join" href="/sets/1/live" />);
    expect(html).toContain('data-variant="director"');
    expect(html).toContain(">Join<");
  });

  it("R-12.2 a computer keeps the primary button", () => {
    touch = false;
    const html = renderToString(<JoinButton label="Join" href="/sets/1/live" />);
    expect(html).toContain('data-variant="primary"');
  });
});
