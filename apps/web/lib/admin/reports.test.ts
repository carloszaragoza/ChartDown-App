import { describe, expect, it } from "vitest";
import { hideReason } from "./reports";

describe("R-07.2 hiding a reported version", () => {
  it("R-07.2 the reason is lyrics when any open report says the version has full lyrics", () => {
    expect(hideReason([{ reason: "other" }, { reason: "lyrics" }])).toBe("lyrics");
  });

  it("R-07.2 the reason is other when no report mentions lyrics", () => {
    expect(hideReason([{ reason: "other" }])).toBe("other");
    expect(hideReason([])).toBe("other");
  });
});
