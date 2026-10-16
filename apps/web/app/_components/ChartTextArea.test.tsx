import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartTextArea } from "./ChartTextArea";

const editor = (flags: { line: number; kind: "warning" | "review" }[]) =>
  renderToString(
    <ChartTextArea
      label="Chart"
      value={"title: Song\nkey: E\n\n[Verse]\n1 | 4 | 5 | 1"}
      onChange={() => {}}
      rows={10}
      flags={flags}
      goToLabel={(line) => `Go to line ${line}`}
    />,
  );

describe("T-2401 the editor marks a flagged line where it is", () => {
  it("R-03.1 only a flagged line has a mark, with its number inside it", () => {
    const html = editor([
      { line: 2, kind: "review" },
      { line: 5, kind: "warning" },
    ]);
    const marks = [...html.matchAll(/class="cd-lines__mark" data-flag="(\w+)"[^>]*><button[^>]*aria-label="Go to line (\d+)"[^>]*>(\d+)</g)];
    expect(marks.map((mark) => [mark[1], mark[2], mark[3]])).toEqual([
      ["review", "2", "2"],
      ["warning", "5", "5"],
    ]);
    expect(html).not.toContain("cd-lines__gutter");
  });

  it("R-03.1 without warnings the editor shows no numbers at all", () => {
    expect(editor([])).not.toContain("cd-lines__mark");
  });

  it("R-03.1 a warning wins over a line to check on the same line", () => {
    const html = editor([
      { line: 4, kind: "review" },
      { line: 4, kind: "warning" },
    ]);
    expect(html.match(/cd-lines__mark"/g)).toHaveLength(1);
    expect(html).toContain('data-flag="warning"');
  });
});
