import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import { compareSets, nextSet, setWhen } from "./when";

const en = createFormatter({ locale: "en", timeZone: "UTC" });
const es = createFormatter({ locale: "es", timeZone: "UTC" });

describe("R-05.1 a set's date and time", () => {
  it("R-05.1 a set at 9:00 shows 9:00 AM with its date, in any time zone", () => {
    expect(setWhen(en, "2026-10-12", "09:00:00", "full")).toBe(
      "Monday, October 12, 2026 · 9:00 AM",
    );
    expect(setWhen(es, "2026-10-12", "18:30", "medium")).toMatch(/12 oct 2026 · 18:30/);
  });

  it("R-05.1 without a time, only the date; without a date, nothing", () => {
    expect(setWhen(en, "2026-10-12", null)).toBe("Oct 12, 2026");
    expect(setWhen(en, null, null)).toBeNull();
  });

  it("R-05.1 sets of the same day are ordered by time; undated ones last", () => {
    const sets = [
      { name: "Evening", date: "2026-10-12", time: "18:00" },
      { name: "Someday", date: null, time: null },
      { name: "Morning", date: "2026-10-12", time: "09:00" },
      { name: "Earlier", date: "2026-10-11", time: null },
    ];
    expect([...sets].sort(compareSets).map((set) => set.name)).toEqual([
      "Earlier",
      "Morning",
      "Evening",
      "Someday",
    ]);
  });
});

describe("T-1301 Stand mode in the side navigation", () => {
  it("T-1301 opens the next set from today, dated sets before undated ones", () => {
    const sets = [
      { id: "past", date: "2026-10-01", time: null, name: "Old" },
      { id: "later", date: "2026-10-20", time: null, name: "Later" },
      { id: "undated", date: null, time: null, name: "Someday" },
      { id: "today-evening", date: "2026-10-07", time: "19:00", name: "Tonight" },
      { id: "today-morning", date: "2026-10-07", time: "09:30", name: "Morning" },
    ];
    expect(nextSet(sets, "2026-10-07")?.id).toBe("today-morning");
    expect(nextSet(sets, "2026-10-21")?.id).toBe("undated");
    expect(nextSet([sets[0]!], "2026-10-07")).toBeNull();
  });
});
