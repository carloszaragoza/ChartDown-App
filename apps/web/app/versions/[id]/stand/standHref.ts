import { keyName, type Chart } from "chartdown";
import type { Display } from "../display";

export type StandTheme = "light" | "stage";

export interface StandPlace {
  /** The current section, counted from 0. */
  section: number;
  display: Display;
  theme: StandTheme;
}

/** Where stand mode is: the section (from 1 in the address), view, key and theme (R-03.3). */
export function standHref(
  path: string,
  place: StandPlace,
  chart: Chart,
  keep: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  if (place.section > 0) params.set("s", String(place.section + 1));
  if (place.display.style === "letters") params.set("view", "letters");
  if (keyName(place.display.key) !== keyName(chart.key))
    params.set("key", keyName(place.display.key));
  if (place.display.beats !== "auto") params.set("beats", place.display.beats);
  if (place.theme === "stage") params.set("theme", "stage");
  // Anything else the page keeps, such as View as (T-802).
  for (const [name, value] of Object.entries(keep)) params.set(name, value);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** The section asked for in the address, kept inside the chart; the first by default. */
export function readSection(chart: Chart, value: string | undefined): number {
  const asked = Math.floor(Number(value)) - 1;
  if (!Number.isFinite(asked) || asked < 0) return 0;
  return Math.min(asked, Math.max(chart.sections.length - 1, 0));
}

/** How stand mode is being shown: numbers or letters, Beats and the theme. */
export interface StandView {
  style: Display["style"];
  beats: Display["beats"];
  theme: StandTheme;
}

/**
 * A link that carries how stand mode is shown now (F-005): the view, Beats and the theme change
 * in the browser, so the links to other songs and to View as follow them, not the server's.
 */
export function withView(href: string, view: StandView): string {
  const [path = href, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  if (view.style === "letters") params.set("view", "letters");
  else params.delete("view");
  if (view.beats !== "auto") params.set("beats", view.beats);
  else params.delete("beats");
  if (view.theme === "stage") params.set("theme", "stage");
  else params.delete("theme");
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

/**
 * The songs the pedal may lead to next (F-005): the next one at the last section, the previous
 * one at the first. They are loaded ahead, so moving on is instant.
 */
export function songsAhead(
  current: number,
  last: number,
  songs: { previousSong?: string | undefined; nextSong?: string | undefined },
): string[] {
  return [
    ...(current === last && songs.nextSong ? [songs.nextSong] : []),
    ...(current === 0 && songs.previousSong ? [songs.previousSong] : []),
  ];
}
