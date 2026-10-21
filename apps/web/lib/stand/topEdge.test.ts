import { describe, expect, it } from "vitest";
import { paintTopEdge, type TopEdgeDocument } from "./topEdge";

function fakeDocument() {
  const content = ["#fbfcfd", "#17212b"];
  const metas = content.map((_, at) => ({
    getAttribute: () => content[at] ?? null,
    setAttribute: (_name: string, value: string) => {
      content[at] = value;
    },
  }));
  const doc: TopEdgeDocument = {
    documentElement: { style: { background: "", colorScheme: "" } },
    querySelectorAll: () => metas,
  };
  return { doc, content };
}

describe("T-2815 stand mode's top edge", () => {
  it("R-03.12 the page and the theme color take stand mode's background, and get theirs back", () => {
    const { doc, content } = fakeDocument();
    const restore = paintTopEdge(doc, "rgb(255, 255, 255)", "light");
    expect(doc.documentElement.style).toEqual({
      background: "rgb(255, 255, 255)",
      colorScheme: "light",
    });
    expect(content).toEqual(["rgb(255, 255, 255)", "rgb(255, 255, 255)"]);
    restore();
    expect(doc.documentElement.style).toEqual({ background: "", colorScheme: "" });
    expect(content).toEqual(["#fbfcfd", "#17212b"]);
  });
});
