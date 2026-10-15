import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionRow } from "./ActionRow";
import { ChoiceControl, needsMenu } from "./ChoiceControl";

const viewAs = [
  { value: "all", label: "All notes" },
  { value: "bass", label: "Bass" },
  { value: "drums", label: "Drums" },
  { value: "guitar", label: "Guitar" },
  { value: "keys", label: "Keys" },
];
const choice = (phone: boolean, options = viewAs) =>
  renderToString(
    <ChoiceControl
      label="View as"
      value="all"
      options={options}
      onChange={() => undefined}
      phone={phone}
    />,
  );

describe("T-2208 choices, lists and headers on a phone", () => {
  it("R-03.9 a choice of more than three options, or with long names, becomes a menu on a phone", () => {
    expect(needsMenu(viewAs)).toBe(true);
    expect(needsMenu([{ label: "Numbers" }, { label: "Letters" }])).toBe(false);
    expect(needsMenu([{ label: "My notes (personal space)" }, { label: "Band" }])).toBe(true);
    expect(choice(true)).not.toContain('role="radiogroup"');
    expect(choice(true)).toContain("All notes");
    expect(choice(false)).toContain('role="radiogroup"');
    // A short choice stays segmented on a phone too.
    expect(choice(true, viewAs.slice(1, 3))).toContain('role="radiogroup"');
  });

  it("R-03.9 a row's title keeps the full width on a phone, its actions under it", () => {
    const row = (phone: boolean) =>
      renderToString(
        <ActionRow
          phone={phone}
          label="Morning Light"
          description="Updated Oct 15, 2026"
          actions={<button type="button">Edit</button>}
        />,
      );
    const phoneRow = row(true);
    expect(phoneRow.indexOf("Morning Light")).toBeLessThan(phoneRow.indexOf("Updated"));
    expect(phoneRow.indexOf("Updated")).toBeLessThan(phoneRow.indexOf(">Edit<"));
    expect(row(false)).toContain(">Edit<");
  });
});
