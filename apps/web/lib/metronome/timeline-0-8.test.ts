import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { timeline } from "./timeline";

describe("T-2302 the metronome plays a counted copy", () => {
  it("R-00.17 @use Chorus 2x plays the copied bars twice before the song goes on", () => {
    const bars = timeline(
      parse("---\ntempo: 60\n---\n## Chorus\n4 | 1\n## Chorus 2\n@use Chorus 2x\n## Outro\n1\n"),
    );
    expect(bars.map((bar) => `${bar.section}.${bar.number}`)).toEqual([
      "0.1",
      "0.2",
      "1.1",
      "1.2",
      "1.1",
      "1.2",
      "2.1",
    ]);
  });
});
