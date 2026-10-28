import { describe, expect, it } from "vitest";
import { readImport } from "./import";

describe("T-3003 importing ChartDown into the visual editor", () => {
  it("R-13.17 a ChartDown text, whatever file it came in, becomes the chart with its header", () => {
    const result = readImport(
      "---\ntitle: Ignored\nkey: G\ntempo: 72 q\nmeter: 6/8\n---\n\n## Verse 1\n> MD keys: Pad only\n1 | 4 | 6m | 5\n\n## Chorus\n4 | 1 '5 | 6m | 4\n",
    );
    expect(result.kind).toBe("chart");
    if (result.kind !== "chart") return;
    expect(result.chart.meta).toMatchObject({ key: "G", tempo: "72 q", meter: "6/8" });
    expect(result.chart.meta.title).toBeUndefined();
    expect(result.chart.sections.map((section) => section.name)).toEqual(["Verse 1", "Chorus"]);
    expect(result.chart.sections[0]?.notes).toHaveLength(1);
  });

  it("R-13.17 a chord sheet with lyrics isn't ChartDown, nor is a binary file", () => {
    const sheet =
      "Verse 1\nG          C\nLanterns burn along the bay\nEm         D\nWaiting for the morning light\n";
    expect(readImport(sheet).kind).toBe("notChartDown");
    expect(readImport("\u0000\u0001PK").kind).toBe("notChartDown");
    expect(readImport("  \n").kind).toBe("empty");
  });

  it("R-13.17 a ChartDown text with warnings lists them instead of importing", () => {
    const result = readImport("## Verse\n1 | 4 | 5 | 1\n{segno} 1 | 4 | {segno} 5 | 1\n");
    expect(result.kind).toBe("warnings");
  });
});
