import { describe, expect, it } from "vitest";
import { swipeTurn } from "./swipe";

describe("R-03.3 a swipe on the chart turns the section", () => {
  it("R-03.3 a swipe to the left is the next section, to the right the previous one", () => {
    expect(swipeTurn(-120, 10)).toBe("next");
    expect(swipeTurn(120, -10)).toBe("previous");
  });

  it("R-03.3 a short or mostly vertical move is not a swipe: the chart scrolls", () => {
    expect(swipeTurn(-30, 0)).toBeNull();
    expect(swipeTurn(-80, 60)).toBeNull();
    expect(swipeTurn(0, -200)).toBeNull();
  });
});
