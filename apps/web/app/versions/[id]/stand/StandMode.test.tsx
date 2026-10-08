import { parse } from "chartdown";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import { readSection, standHref } from "./standHref";
import { StandMode, type StandModeProps } from "./StandMode";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

const OPEN_ROAD = readFileSync(
  new URL("../../../../../../packages/core/fixtures/open-road.chartdown", import.meta.url),
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
    expect(html).toContain("cd-chart cd-chart--sm");
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
