import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { chartClicks } from "../video/sections";
import { playedIn } from "./follow";

// 60 beats a minute in 4/4: each bar lasts 4 seconds.
const placed = chartClicks(
  parse("---\ntempo: 60\n---\n\n## Verse\n1 | 4 | 6m | 5\n1 | 4 | 5 | 1\n"),
);

describe("T-3003 the visual editor follows the player", () => {
  it("R-13.15 the row being played gets its bar, as the other editors' charts do", () => {
    const clock = { time: 6, musicStart: 0, playing: true };
    expect(playedIn(placed, clock, 0, 0)).toMatch(/^1:[\d.]+:[01]$/);
    expect(playedIn(placed, clock, 0, 1)).toBe("");
    expect(playedIn(placed, { ...clock, time: 17 }, 0, 1)).toMatch(/^0:/);
  });

  it("R-13.15 nothing is followed while the player is paused or with no player", () => {
    expect(playedIn(placed, { time: 6, musicStart: 0, playing: false }, 0, 0)).toBe("");
    expect(playedIn(placed, null, 0, 0)).toBe("");
  });
});
