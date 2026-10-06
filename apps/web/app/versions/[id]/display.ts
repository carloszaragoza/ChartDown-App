import {
  keyName,
  parseKeyName,
  transposeKey,
  type Chart,
  type ChordStyle,
  type Key,
} from "chartdown";

/** How a chart is shown (R-03.2): numbers or letters, in a home key. The chart never changes. */
export interface Display {
  style: ChordStyle;
  key: Key;
}

/** The 12 keys of a mode, starting from C, spelled as musicians name them. */
export function keysInMode(minor: boolean): Key[] {
  return Array.from({ length: 12 }, (_, step) => transposeKey({ root: "C", minor }, step));
}

/** The display asked for in the address; anything unknown falls back to numbers in the written key. */
export function readDisplay(
  chart: Chart,
  params: { view?: string | undefined; key?: string | undefined },
): Display {
  const style: ChordStyle = params.view === "letters" ? "letters" : "numbers";
  const asked = params.key ? parseKeyName(params.key) : undefined;
  const known =
    asked &&
    keysInMode(chart.key.minor).some((key) => key.root === asked.root && key.minor === asked.minor);
  return { style, key: known ? asked : chart.key };
}

/** The address of a page shown with a display; the defaults are left out. */
export function displayHref(path: string, display: Display, chart: Chart): string {
  const params = new URLSearchParams();
  if (display.style === "letters") params.set("view", "letters");
  if (keyName(display.key) !== keyName(chart.key)) params.set("key", keyName(display.key));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
