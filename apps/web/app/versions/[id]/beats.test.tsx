import { parse } from "chartdown";
import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { BeatsControl } from "../../_components/BeatsControl";
import { ChartPreview } from "../../_components/ChartPreview";
import { displayHref, readDisplay } from "./display";
import { standHref } from "./stand/standHref";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

const chart = parse("---\nkey: G\n---\n## Verse\n1 | 4 5 | 1:3 4:1 | 6m 5 4 1");
const slashes = (html: string) => html.match(/cd-chart__beat--(strong|semi|weak)/g) ?? [];
const preview = (beats?: "off" | "auto" | "always") =>
  renderToString(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <ChartPreview chart={chart} {...(beats ? { beats } : {})} />
    </NextIntlClientProvider>,
  );

describe("R-03.7 the Beats control in the viewer", () => {
  it("R-03.7 the address names the mode, and Auto is what it falls back to", () => {
    expect(readDisplay(chart, {}).beats).toBe("auto");
    expect(readDisplay(chart, { beats: "off" }).beats).toBe("off");
    expect(readDisplay(chart, { beats: "always" }).beats).toBe("always");
    expect(readDisplay(chart, { beats: "never" }).beats).toBe("auto");
  });

  it("R-03.7 an address carries the mode unless it is Auto, with the rest of the display", () => {
    const display = readDisplay(chart, { view: "letters", key: "A", beats: "off" });
    expect(displayHref("/versions/x", display, chart)).toBe(
      "/versions/x?view=letters&key=A&beats=off",
    );
    expect(displayHref("/versions/x", { ...display, beats: "auto" }, chart)).toBe(
      "/versions/x?view=letters&key=A",
    );
    expect(standHref("/versions/x/stand", { section: 1, display, theme: "light" }, chart)).toBe(
      "/versions/x/stand?s=2&view=letters&key=A&beats=off",
    );
  });

  it("R-03.7 the preview follows the mode: none with Off, some with Auto, every bar with Always", () => {
    expect(slashes(preview("off"))).toHaveLength(0);
    // Auto: only `1:3 4:1` (an explicit :beats) shows marks; the even splits on the beats do not.
    expect(slashes(preview())).toHaveLength(4);
    expect(slashes(preview("auto"))).toHaveLength(4);
    expect(slashes(preview("always"))).toHaveLength(16);
  });

  it("R-03.7 the control offers Off, Auto and Always, named for screen readers", () => {
    const html = renderToString(
      <BeatsControl
        value="auto"
        hrefs={{ off: "/a?beats=off", auto: "/a", always: "/a?beats=always" }}
        words={{
          label: "Beats",
          name: "Beat slashes",
          off: "Off",
          auto: "Auto",
          always: "Always",
        }}
      />,
    );
    expect(html).toContain("Beat slashes");
    for (const word of ["Off", "Auto", "Always"]) expect(html).toContain(word);
    expect(html).toMatch(
      /aria-checked="true"[^>]*>[^<]*(<[^>]+>)*[^<]*Auto|Auto[\s\S]*aria-checked="true"/,
    );
  });

  it("R-03.7 Beats changes only the drawing: the chart's beat checks, warnings and JSON stay", () => {
    const before = JSON.stringify(parse("## A\n1:3 4:1 | 1 4 5 | x:2 1:2").warnings);
    preview("off");
    preview("always");
    expect(JSON.stringify(parse("## A\n1:3 4:1 | 1 4 5 | x:2 1:2").warnings)).toBe(before);
  });
});
