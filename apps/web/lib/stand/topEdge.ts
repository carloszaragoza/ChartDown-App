type Painted = { style: { background: string; colorScheme: string } };

export type TopEdgeDocument = {
  documentElement: Painted;
  querySelectorAll(selector: string): Iterable<{
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
  }>;
};

/**
 * Stand mode paints the screen's top edge in its own mode (T-2815): the page behind it and the
 * browser's theme color, which a phone draws under its status bar, take stand mode's background
 * instead of the system's light or dark one. Gives back what was there.
 */
export function paintTopEdge(
  doc: TopEdgeDocument,
  background: string,
  scheme: "light" | "dark",
): () => void {
  const page = doc.documentElement.style;
  const was = { background: page.background, colorScheme: page.colorScheme };
  page.background = background;
  page.colorScheme = scheme;
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')];
  const colors = metas.map((meta) => meta.getAttribute("content") ?? "");
  for (const meta of metas) meta.setAttribute("content", background);
  return () => {
    page.background = was.background;
    page.colorScheme = was.colorScheme;
    metas.forEach((meta, at) => meta.setAttribute("content", colors[at] ?? ""));
  };
}
