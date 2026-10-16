import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LineupForm } from "./EditControls";

vi.mock("../../actions", () => ({
  appointTempMd: () => undefined,
  deleteSet: () => undefined,
  saveLineup: () => undefined,
  setSongKey: () => undefined,
}));

const NAMES = ["Ana", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hal", "Ivy", "Jon", "Kai", "Lia"];
const form = (count: number) =>
  renderToString(
    <LineupForm
      setId="00000000-0000-4000-8000-0000000000a1"
      members={NAMES.slice(0, count).map((name, index) => ({
        id: `m${index}`,
        name,
        plays: index === 0 ? ["bass"] : [],
        menu: `Instruments for ${name}`,
      }))}
      instruments={[
        { id: "bass", name: "Bass" },
        { id: "keys", name: "Keys" },
      ]}
      words={{ save: "Save lineup", filter: "Find a musician", none: "Not playing" }}
    />,
  );

describe("T-2407 the lineup stays short with many musicians", () => {
  it("R-05.3 one line per musician, their instruments in a menu", () => {
    const html = form(12);
    expect(html.match(/role="combobox"/g)).toHaveLength(12);
    expect(html).toContain(">Instruments for Lia</label>");
    // What is chosen is shown and saved: Ana plays bass.
    expect(html).toContain('name="instrument-m0" value="bass"');
    expect(html).not.toContain('type="checkbox"');
  });

  it("R-05.3 a filter by name appears with more than 8 musicians", () => {
    expect(form(12)).toContain("Find a musician");
    expect(form(8)).not.toContain("Find a musician");
  });
});
