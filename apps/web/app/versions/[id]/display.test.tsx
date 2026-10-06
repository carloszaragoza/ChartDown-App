import { parse } from "chartdown";
import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ChartBody } from "./ChartBody";
import { displayHref, keysInMode, readDisplay } from "./display";

// An original example in G: 6m 5 4 1.
const chart = parse("---\nkey: G\n---\n## Intro\n6m | 5 | 4 | 1\n");
const body = (style: "numbers" | "letters", key?: string) =>
  renderToString(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <ChartBody chart={chart} style={style} homeKey={readDisplay(chart, { key }).key} />
    </NextIntlClientProvider>,
  );
// The root of each chord (its quality, such as m, is drawn apart).
const chords = (html: string) =>
  [...html.matchAll(/class="cd-chord(?: cd-chord--[^"]*)?"[^>]*>([^<]+)/g)].map(
    (match) => match[1],
  );

describe("R-03.2 numbers or letters, and transposition", () => {
  it("R-03.2 letters show the chords in the written key", () => {
    expect(chords(body("letters"))).toEqual(["E", "D", "C", "G"]);
  });

  it("R-03.2 transposing shows the chords in the new key", () => {
    expect(chords(body("letters", "A"))).toEqual(["F#", "E", "D", "A"]);
  });

  it("R-03.2 numbers stay the same in any key", () => {
    expect(chords(body("numbers"))).toEqual(["6", "5", "4", "1"]);
    expect(chords(body("numbers", "A"))).toEqual(chords(body("numbers")));
  });

  it("R-03.2 an unknown key falls back to the written key", () => {
    expect(readDisplay(chart, { view: "letters", key: "H#" })).toEqual({
      style: "letters",
      key: { root: "G", minor: false },
    });
    // A minor key is not offered for a major chart.
    expect(readDisplay(chart, { key: "Am" }).key).toEqual({ root: "G", minor: false });
    expect(readDisplay(chart, {}).style).toBe("numbers");
  });

  it("R-03.2 the address keeps only what differs from the defaults", () => {
    const path = "/versions/x";
    expect(displayHref(path, readDisplay(chart, {}), chart)).toBe(path);
    expect(displayHref(path, readDisplay(chart, { view: "letters", key: "Bb" }), chart)).toBe(
      `${path}?view=letters&key=Bb`,
    );
    expect(keysInMode(false)).toHaveLength(12);
    expect(keysInMode(true).map((key) => key.root)).toContain("G#");
  });
});
