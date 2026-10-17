import { parse } from "chartdown";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import { readSection, songsAhead, standHref, withView } from "./standHref";
import { StandMode, type StandModeProps } from "./StandMode";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

const OPEN_ROAD = readFileSync(
  new URL("../../../../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);
const chart = parse(OPEN_ROAD);
const ID = "00000000-0000-0000-0000-0000000000f1";
const render = (overrides: Partial<StandModeProps> = {}) =>
  renderToString(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <StandMode
        versionId={ID}
        title="Open Road"
        content={OPEN_ROAD}
        section={0}
        style="numbers"
        homeKey={chart.key}
        theme="light"
        {...overrides}
      />
    </NextIntlClientProvider>,
  );

describe("R-03.3 stand mode", () => {
  it("R-03.3 the current section is drawn large in a card and the next one as a small preview", () => {
    const html = render({ section: 2 });
    const current = html.slice(html.indexOf('id="current-section"'));
    // The current section: its name, then its bars (BarRow, Design Handoff 2.0 screen 03).
    expect(current).toMatch(/^id="current-section"[^>]*>.*?<h2[^>]*>Chorus<\/h2>/s);
    expect(current).toMatch(/role="group"/);
    // The preview of the next section, small and in the secondary color.
    expect(html).toContain("Verse 2");
    // The current section at stand mode's size; the next one as the small preview (chart.css).
    expect(html).toContain("cd-chart cd-chart--lg");
    // Verse 2 has a note: the preview shows it in place of its first bars (T-2703).
    expect(html.slice(html.indexOf("Verse 2"))).toMatch(/>MD</);
    expect(html).not.toContain("cd-chart cd-chart--sm");
    expect(html).toContain("Section 3 of 7");
  });

  it("R-03.3 Previous and Next move one section; none before the first or after the last", () => {
    const first = render();
    expect(first).toContain(`href="/versions/${ID}/stand?s=2"`);
    expect(first).not.toContain(">Previous<");
    const last = render({ section: 6 });
    expect(last).toContain(`href="/versions/${ID}/stand?s=6"`);
    expect(last).toContain(">Previous<");
    expect(last).not.toContain(">Next<");
    expect(last).toContain("End of the song");
  });

  it("R-03.3 the stage theme changes colors only, through the theme tokens", () => {
    expect(render({ theme: "stage" })).toContain('data-theme="dark"');
    expect(render()).toContain('data-theme="light"');
  });

  it("R-03.3 the address keeps the section, the view, the key and the theme", () => {
    const place = {
      section: 3,
      display: {
        style: "letters" as const,
        key: { root: "A", minor: false },
        beats: "auto" as const,
      },
      theme: "stage" as const,
    };
    expect(standHref(`/versions/${ID}/stand`, place, chart)).toBe(
      `/versions/${ID}/stand?s=4&view=letters&key=A&theme=stage`,
    );
    expect(
      standHref(
        "/x",
        {
          section: 0,
          display: { style: "numbers", key: chart.key, beats: "auto" },
          theme: "light",
        },
        chart,
      ),
    ).toBe("/x");
    expect(readSection(chart, "4")).toBe(3);
    expect(readSection(chart, "99")).toBe(6);
    expect(readSection(chart, "nope")).toBe(0);
  });
});

describe("F-005 stand mode feels local", () => {
  const view = { style: "numbers", beats: "auto", theme: "light" } as const;

  it("F-005 the links to other songs and View as carry the view as it is now", () => {
    const song = "/sets/1/songs/2/stand?view=letters&as=bass&s=999";
    expect(withView(song, view)).toBe("/sets/1/songs/2/stand?as=bass&s=999");
    expect(
      withView("/sets/1/songs/2/stand", { style: "letters", beats: "always", theme: "stage" }),
    ).toBe("/sets/1/songs/2/stand?view=letters&beats=always&theme=stage");
  });

  it("F-005 the song the pedal leads to next is loaded ahead at the edges only", () => {
    const songs = { previousSong: "/sets/1/songs/1/stand", nextSong: "/sets/1/songs/3/stand" };
    expect(songsAhead(6, 6, songs)).toEqual(["/sets/1/songs/3/stand"]);
    expect(songsAhead(0, 6, songs)).toEqual(["/sets/1/songs/1/stand"]);
    expect(songsAhead(3, 6, songs)).toEqual([]);
    expect(songsAhead(0, 0, songs)).toEqual(["/sets/1/songs/3/stand", "/sets/1/songs/1/stand"]);
    expect(songsAhead(6, 6, {})).toEqual([]);
  });

  it("F-005 Next song links to the next song with the current view, not a page reload", () => {
    const html = render({
      section: 6,
      style: "letters",
      set: {
        href: "/sets/1",
        name: "Sunday",
        songOf: "Song 2 of 3",
        nextSong: "/sets/1/songs/3/stand",
      },
    });
    expect(html).toContain('href="/sets/1/songs/3/stand?view=letters"');
  });
});

describe("F-006 View as follows the songs", () => {
  const view = { style: "numbers", beats: "auto", theme: "light" } as const;

  it("F-006 the links to other songs carry the View as chosen in place", () => {
    const song = "/sets/1/songs/2/stand?as=bass";
    expect(withView(song, { ...view, as: "keys" })).toBe("/sets/1/songs/2/stand?as=keys");
    expect(withView(song, { ...view, as: null })).toBe("/sets/1/songs/2/stand");
    expect(withView(song, view)).toBe("/sets/1/songs/2/stand?as=bass");
  });
});
