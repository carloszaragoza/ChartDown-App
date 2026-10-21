import { describe, expect, it } from "vitest";
import { surfaceColor, type Surface } from "./topEdge";

type Box = Surface & { color: string };
const box = (color: string, parentElement: Box | null = null): Box => ({ color, parentElement });

describe("T-2815 the screen's top edge", () => {
  it("R-03.12 takes the first painted surface under the status bar", () => {
    const header = box("rgb(27, 27, 27)", box("rgb(15, 22, 29)"));
    const title = box("rgba(0, 0, 0, 0)", box("transparent", header));
    expect(surfaceColor(title, (surface) => surface.color)).toBe("rgb(27, 27, 27)");
  });

  it("R-03.12 looks through a see-through layer such as a sheet's backdrop", () => {
    const page = box("rgb(251, 252, 253)");
    const backdrop = box("rgba(0, 0, 0, 0.4)", box("color(srgb 0 0 0 / 0.5)", page));
    expect(surfaceColor(backdrop, (surface) => surface.color)).toBe("rgb(251, 252, 253)");
  });

  it("R-03.12 knows no color when nothing is painted", () => {
    expect(surfaceColor(box("rgba(0, 0, 0, 0)"), (surface) => surface.color)).toBeNull();
    expect(surfaceColor(null, (surface: Box) => surface.color)).toBeNull();
  });
});
