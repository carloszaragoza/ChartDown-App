import { describe, expect, it } from "vitest";
import { createWarning, WARNING_CODES } from "./warnings.js";

describe("WARNING_CODES", () => {
  it("lists every warning code once, each with an English message", () => {
    expect(new Set(WARNING_CODES).size).toBe(WARNING_CODES.length);
    expect(WARNING_CODES).toContain("landmark-too-long");
    for (const code of WARNING_CODES) expect(createWarning(1, code, {}).message).not.toBe("");
  });
});
