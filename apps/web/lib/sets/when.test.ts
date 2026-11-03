import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import { compareSets, nextSet, personTimeZone, setSummary, setWhen, todayIn } from "./when";

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

describe("R-05.6 the line under a set", () => {
  const words = { today: "Today", noDate: "No date" };

  it("R-05.6 a date used as the name says Today when that day is today, and does not repeat the date", () => {
    expect(
      setSummary(
        en,
        {
          name: "11/1/2026",
          date: "2026-11-01",
          time: null,
          band: "LifeStone Church",
          type: "Service",
        },
        "2026-11-01",
        words,
      ),
    ).toBe("LifeStone Church · Service · Today");
  });

  it("R-05.6 a named set says the band, the type and the date", () => {
    expect(
      setSummary(
        en,
        {
          name: "Youth night",
          date: "2026-10-18",
          time: null,
          band: "LifeStone Church",
          type: "Service",
        },
        "2026-11-01",
        words,
      ),
    ).toBe("LifeStone Church · Service · Oct 18, 2026");
  });

  it("R-05.6 a past set whose name is the date keeps the time and drops the second date", () => {
    expect(
      setSummary(
        en,
        {
          name: "10/25/2026",
          date: "2026-10-25",
          time: "18:00",
          band: "LifeStone Church",
          type: "Rehearsal",
        },
        "2026-11-01",
        words,
      ),
    ).toBe("LifeStone Church · Rehearsal · 6:00 PM");
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

describe("F-004 today is the person's own day", () => {
  it("F-004 at 9 p.m. in Mexico City it is still the same day, though UTC is already tomorrow", () => {
    const night = new Date("2026-10-14T03:01:00Z");
    expect(todayIn("America/Mexico_City", night)).toBe("2026-10-13");
    expect(todayIn("UTC", night)).toBe("2026-10-14");
    const tonight = [{ id: "tonight", date: "2026-10-13", time: "21:30", name: "Tonight" }];
    expect(nextSet(tonight, todayIn("America/Mexico_City", night))?.id).toBe("tonight");
  });

  it("F-004 the browser's time zone first, then the connection's, then UTC", () => {
    expect(personTimeZone("America/Mexico_City", "Europe/Madrid")).toBe("America/Mexico_City");
    expect(personTimeZone(undefined, "Europe/Madrid")).toBe("Europe/Madrid");
    expect(personTimeZone("Not/AZone", null)).toBe("UTC");
    expect(todayIn("Not/AZone", new Date("2026-10-14T03:01:00Z"))).toBe("2026-10-14");
  });
});
