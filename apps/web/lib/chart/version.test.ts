import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { withChartVersion } from "./version";

describe("R-00.4 the app writes the format version into every chart it saves", () => {
  it("R-00.4 a chart with no header gets one that declares 0.7", () => {
    const saved = withChartVersion("## Verse\n1 | 4");
    expect(saved).toBe("---\nchartdown: 0.7\n---\n## Verse\n1 | 4");
    expect(parse(saved).version).toBe("0.7");
  });

  it("R-00.4 a header with no version gets the field first, and keeps its other fields", () => {
    expect(withChartVersion("---\ntitle: Open Road\nkey: G\n---\n## A\n1")).toBe(
      "---\nchartdown: 0.7\ntitle: Open Road\nkey: G\n---\n## A\n1",
    );
  });

  it.each(["0.3", "0.4", "0.5", "0.7"])(
    "R-00.4 a chart written for %s is brought to 0.7",
    (old) => {
      const saved = withChartVersion(`---\nchartdown: ${old}\ntitle: A\n---\n## A\n1`);
      expect(saved).toBe("---\nchartdown: 0.7\ntitle: A\n---\n## A\n1");
      expect(parse(saved).warnings).toEqual([]);
    },
  );

  it("R-00.4 a chart that already declares 0.7, or a version this parser does not read, is left alone", () => {
    const current = "---\nchartdown: 0.7\n---\n## A\n1";
    expect(withChartVersion(current)).toBe(current);
    const later = "---\nchartdown: 0.9\n---\n## A\n1";
    expect(withChartVersion(later)).toBe(later);
    const odd = "---\nchartdown: soon\n---\n## A\n1";
    expect(withChartVersion(odd)).toBe(odd);
  });

  it("R-00.4 saving twice changes nothing, and Windows line breaks stay", () => {
    const once = withChartVersion("## A\n1");
    expect(withChartVersion(once)).toBe(once);
    expect(withChartVersion("## A\r\n1")).toBe("---\r\nchartdown: 0.7\r\n---\r\n## A\r\n1");
  });

  it("R-00.4 a version in a note or a bar is not the header's, and a blank chart stays blank", () => {
    const text = "## A\n> chartdown: 0.4\n1";
    expect(withChartVersion(text).startsWith("---\nchartdown: 0.7\n---\n")).toBe(true);
    expect(withChartVersion("  \n")).toBe("  \n");
  });

  it("R-00.4 a header that is never closed still gets its version before the first section", () => {
    const saved = withChartVersion("---\ntitle: A\n## A\n1");
    expect(saved).toBe("---\nchartdown: 0.7\ntitle: A\n## A\n1");
  });
});
