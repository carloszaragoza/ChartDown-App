import { describe, expect, it } from "vitest";
import { bodyLine, splitTitle, withTitle } from "./title";

describe("T-2404 the title is written once, in the details", () => {
  it("R-02.1 the editor's text leaves out the header's title, and saving puts it back", () => {
    const saved = "---\nchartdown: 0.8\ntitle: Lantern Song\nkey: E\n---\n## Verse\n1 | 4\n";
    const { title, body } = splitTitle(saved);
    expect(title).toBe("Lantern Song");
    expect(body).toBe("---\nchartdown: 0.8\nkey: E\n---\n## Verse\n1 | 4\n");
    expect(withTitle(body, "Lantern Song")).toBe(
      "---\ntitle: Lantern Song\nchartdown: 0.8\nkey: E\n---\n## Verse\n1 | 4\n",
    );
  });

  it("R-02.1 a header left with only the title goes away, and comes back on save", () => {
    const { body } = splitTitle('---\ntitle: "Quiet Field"\n---\n## Verse\n1\n');
    expect(body).toBe("## Verse\n1\n");
    expect(withTitle(body, "Quiet Field")).toBe("---\ntitle: Quiet Field\n---\n## Verse\n1\n");
  });

  it("R-02.1 a title typed in the text is replaced by the details' title", () => {
    expect(withTitle("---\ntitle: Old\nkey: G\n---\n1\n", "New")).toBe(
      "---\ntitle: New\nkey: G\n---\n1\n",
    );
  });

  it("R-02.1 a chart with no title, or a title only after the header, is left as it is", () => {
    expect(splitTitle("## Verse\ntitle: not a field\n")).toEqual({
      title: null,
      body: "## Verse\ntitle: not a field\n",
      removed: [],
    });
  });

  it("R-10.8 an import's line numbers follow the chart once the title is out", () => {
    const draft = "---\ntitle: Harbor\n---\n## Verse\n1 | 4\n";
    const { body, removed } = splitTitle(draft);
    expect(removed).toEqual([1, 2, 3]);
    expect(body.split("\n")[(bodyLine(5, removed) ?? 0) - 1]).toBe("1 | 4");
    expect(bodyLine(2, removed)).toBeNull();
    const kept = splitTitle("---\nkey: E\ntitle: Harbor\n---\n1\n");
    expect(bodyLine(5, kept.removed)).toBe(4);
  });
});
