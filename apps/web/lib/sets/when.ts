import type { createFormatter } from "next-intl";

type Formatter = ReturnType<typeof createFormatter>;

/**
 * A set's date, and its time when it has one (R-05.1, T-708). The time is the band's local time
 * as written, so both are formatted as written, with no time zone conversion.
 */
export function setWhen(
  format: Formatter,
  date: string | null,
  time: string | null,
  style: "full" | "medium" = "medium",
): string | null {
  if (!date) return null;
  const day = format.dateTime(new Date(`${date}T00:00:00Z`), { dateStyle: style, timeZone: "UTC" });
  if (!time) return day;
  const clock = format.dateTime(new Date(`${date}T${time.slice(0, 5)}:00Z`), {
    timeStyle: "short",
    timeZone: "UTC",
  });
  return `${day} · ${clock}`;
}

/** Upcoming sets in order: by date, then time (untimed first that day), then name. */
export function compareSets(
  a: { date: string | null; time?: string | null; name: string },
  b: { date: string | null; time?: string | null; name: string },
): number {
  if (a.date !== b.date) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  }
  if ((a.time ?? "") !== (b.time ?? "")) return (a.time ?? "").localeCompare(b.time ?? "");
  return a.name.localeCompare(b.name);
}
