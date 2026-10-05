import { parse } from "@chartdown/core";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { VersionView, type VersionViewProps } from "./VersionView";

const openRoad = parse(
  readFileSync(
    new URL("../../../../../packages/core/fixtures/open-road.chartdown", import.meta.url),
    "utf8",
  ),
);
const props: VersionViewProps = {
  id: "00000000-0000-0000-0000-0000000000f1",
  title: "Open Road",
  artists: ["ChartDown examples"],
  author: "Carlos",
  source: {
    type: "own_arrangement",
    album: null,
    year: 2026,
    youtube: "https://www.youtube.com/watch?v=x",
  },
  chart: openRoad,
  signedIn: false,
};
const render = (locale: "en" | "es", overrides: Partial<VersionViewProps> = {}) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <VersionView {...props} {...overrides} />
    </NextIntlClientProvider>,
  );

describe("R-01.4 a public version as everyone reads it", () => {
  it("R-01.4 shows the song, its author, its source and every section of the chart", () => {
    const html = render("en");
    expect(html).toContain("<h1");
    expect(html).toContain("Open Road");
    expect(html).toContain("Arrangement by Carlos");
    expect(html).toContain("Own arrangement · 2026");
    expect(html).toContain("Watch on YouTube");
    expect(html.match(/class="cd-section"/g)).toHaveLength(openRoad.sections.length);
  });

  it("R-06.5 shows no band's layer, only the author's own notes", () => {
    const html = render("en");
    expect(html).toContain("Up a whole step. Full band.");
    expect(html).not.toContain("Move the pad up an octave");
  });

  it("R-01.4 offers a visitor to fork by signing in first, and comes back here", () => {
    expect(render("en")).toContain(
      'href="/auth/sign-in?next=%2Fversions%2F00000000-0000-0000-0000-0000000000f1"',
    );
    expect(render("es")).toContain("Hacer mi copia");
    expect(render("en", { signedIn: true })).not.toContain("/auth/sign-in");
  });
});
