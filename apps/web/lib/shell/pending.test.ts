import { describe, expect, it } from "vitest";
import { pendingTarget } from "./pending";

const tap = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const link = (href: string, extra: Partial<{ target: string; hasDownload: boolean }> = {}) => ({
  href,
  target: "",
  hasDownload: false,
  ...extra,
});
const here = "https://www.chartdown.app/catalog?q=road";

describe("F-003 which taps show skeletons while the next page loads", () => {
  it("F-003 a plain tap on a link to another page of the app shows them", () => {
    expect(pendingTarget(link("/sets"), tap, here)).toBe("/sets");
    expect(pendingTarget(link("https://www.chartdown.app/versions/v1/stand"), tap, here)).toBe(
      "/versions/v1/stand",
    );
  });

  it("F-003 a link that stays on the same page shows none: a section, numbers or letters", () => {
    expect(pendingTarget(link("/catalog?q=lantern"), tap, here)).toBeNull();
    expect(
      pendingTarget(
        link("/versions/v1/stand?s=3"),
        tap,
        "https://www.chartdown.app/versions/v1/stand?s=2",
      ),
    ).toBeNull();
    expect(pendingTarget(link("#section-2"), tap, here)).toBeNull();
  });

  it("F-003 a new tab, a modified click, a download or another site shows none", () => {
    expect(pendingTarget(link("/sets", { target: "_blank" }), tap, here)).toBeNull();
    expect(pendingTarget(link("/sets", { hasDownload: true }), tap, here)).toBeNull();
    expect(pendingTarget(link("/sets"), { ...tap, metaKey: true }, here)).toBeNull();
    expect(pendingTarget(link("/sets"), { ...tap, ctrlKey: true }, here)).toBeNull();
    expect(pendingTarget(link("/sets"), { ...tap, button: 1 }, here)).toBeNull();
    expect(pendingTarget(link("https://github.com/ChartDown/Language"), tap, here)).toBeNull();
    expect(pendingTarget(link("/sets", { target: "_self" }), tap, here)).toBe("/sets");
  });
});
