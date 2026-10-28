import { afterEach, describe, expect, it } from "vitest";
import { barSeek, type ChartBar } from "./clock";

describe("barSeek", () => {
  afterEach(() => barSeek.forget());

  it("R-03.11 a bar chosen before the player is opened is kept, so the player opens on it (T-3015)", () => {
    expect(barSeek.chosen()).toBeNull();
    barSeek.request({ section: 1, number: 6 });
    const heard: ChartBar[] = [];
    const stop = barSeek.subscribe((bar) => heard.push(bar));
    expect(barSeek.chosen()).toEqual({ section: 1, number: 6 });
    barSeek.request({ section: 2, number: 1 });
    expect(heard).toEqual([{ section: 2, number: 1 }]);
    stop();
  });

  it("R-13.15 leaving the page forgets the chosen bar (T-3015)", () => {
    barSeek.request({ section: 0, number: 3 });
    barSeek.forget();
    expect(barSeek.chosen()).toBeNull();
  });
});
