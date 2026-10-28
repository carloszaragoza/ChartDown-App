import { describe, expect, it } from "vitest";
import { addTap, TAP_RESET_MS, tapTempo } from "./tap";

describe("T-3003 tap tempo", () => {
  it("R-13.2 taps on the beat give the tempo; a long pause starts counting again", () => {
    let taps: number[] = [];
    expect(tapTempo(taps)).toBeNull();
    for (const at of [0, 833, 1667, 2500]) taps = addTap(taps, at);
    expect(tapTempo(taps)).toBe(72);
    taps = addTap(taps, 2500 + TAP_RESET_MS + 1);
    expect(taps).toHaveLength(1);
    expect(tapTempo(taps)).toBeNull();
    taps = addTap(taps, 2500 + TAP_RESET_MS + 1 + 500);
    expect(tapTempo(taps)).toBe(120);
  });

  it("R-13.2 only the latest taps count, so a tempo that settles is followed", () => {
    let taps: number[] = [];
    for (let i = 0; i < 4; i += 1) taps = addTap(taps, i * 1000);
    for (let i = 1; i <= 8; i += 1) taps = addTap(taps, 3000 + i * 500);
    expect(tapTempo(taps)).toBe(120);
  });
});
