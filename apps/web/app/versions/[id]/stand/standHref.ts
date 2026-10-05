import { keyName, type Chart } from "@chartdown/core";
import type { Display } from "../display";

export type StandTheme = "light" | "stage";

export interface StandPlace {
  /** The current section, counted from 0. */
  section: number;
  display: Display;
  theme: StandTheme;
}

/** Where stand mode is: the section (from 1 in the address), view, key and theme (R-03.3). */
export function standHref(path: string, place: StandPlace, chart: Chart): string {
  const params = new URLSearchParams();
  if (place.section > 0) params.set("s", String(place.section + 1));
  if (place.display.style === "letters") params.set("view", "letters");
  if (keyName(place.display.key) !== keyName(chart.key))
    params.set("key", keyName(place.display.key));
  if (place.theme === "stage") params.set("theme", "stage");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** The section asked for in the address, kept inside the chart; the first by default. */
export function readSection(chart: Chart, value: string | undefined): number {
  const asked = Math.floor(Number(value)) - 1;
  if (!Number.isFinite(asked) || asked < 0) return 0;
  return Math.min(asked, Math.max(chart.sections.length - 1, 0));
}
