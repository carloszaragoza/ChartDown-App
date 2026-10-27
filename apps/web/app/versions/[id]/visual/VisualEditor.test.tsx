import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";
import { VISUAL_ICONS } from "../../../../lib/visual/icons";
import { VisualEditor, type VisualEditorProps } from "./VisualEditor";

vi.mock("../edit/actions", () => ({ saveChart: () => undefined }));
vi.mock("../actions", () => ({ saveVideoPoints: () => undefined }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
  usePathname: () => "/",
}));

const props = (content: string): VisualEditorProps => ({
  versionId: "00000000-0000-0000-0000-0000000000f1",
  title: "Lantern Bay",
  artists: ["Harbor Lights"],
  author: "Ana Ruiz",
  revisionId: "00000000-0000-0000-0000-0000000000d1",
  content,
  source: { sourceType: "own_arrangement", album: "", year: "", youtube: "" },
  videoStart: null,
  videoEnd: null,
  recordings: [],
  bands: [],
});
const wrap = (locale: "en" | "es", node: React.ReactNode) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );

describe("T-3003 the visual editor", () => {
  it("R-13.2 R-13.3 the chart's header, then the section's bars as the chart draws them", () => {
    const html = wrap(
      "en",
      <VisualEditor
        {...props(
          '---\ntitle: Lantern Bay\nkey: G\ntempo: 72 q\nmeter: 4/4\n---\n\n## Verse 1\n> MD keys: Pad only\n1 | 4 {drums: in} | 5 "Take the road"\n',
        )}
      />,
    );
    expect(html).toContain("Lantern Bay");
    expect(html).toContain("Arranged by Ana Ruiz");
    expect(html).toContain("Key G");
    expect(html).toMatch(/<h2[^>]*>Verse 1</);
    expect(html).toContain("cd-chart--editable");
    expect(html).toContain("Pad only");
    expect(html).toContain("“Take the road”");
    // The bars are read in full words (R-13.13).
    expect(html).toContain('aria-label="Verse 1, bar 2, four, 4 beats"');
    expect(html).toContain("Add a section");
  });

  it("R-13.7 the tools sit at the foot, ready to drag", () => {
    const html = wrap("es", <VisualEditor {...props("---\nkey: G\n---\n\n## Verso 1\n1\n")} />);
    expect(html).toContain("Síncopa corta");
    expect(html).toContain("Calderón");
    expect(html).toMatch(/draggable="true"/);
  });

  it("R-13.7 the tools are grouped by what they apply to: chord, bar, road map, dynamics", () => {
    const html = wrap("en", <VisualEditor {...props("---\nkey: G\n---\n\n## Verse 1\n1\n")} />);
    const groups = ["Chord", "Bar", "Road map", "Dynamics"].map((name) =>
      html.indexOf(`aria-label="${name}"`),
    );
    expect(groups.every((at) => at > 0)).toBe(true);
    expect([...groups].sort((a, b) => a - b)).toEqual(groups);
    // Each tool sits in its group: the push with the chord, the coda in the road map.
    expect(html.indexOf("Push")).toBeGreaterThan(groups[0] as number);
    expect(html.indexOf("Push")).toBeLessThan(groups[1] as number);
    expect(html.lastIndexOf("D.S. al Coda")).toBeGreaterThan(groups[2] as number);
    expect(html.lastIndexOf(">mf</text>")).toBeGreaterThan(groups[3] as number);
    expect(html).toContain("Select a bar");
  });

  it("R-13.16 every action has its icon from one list, the chart's marks drawn as the chart draws them", () => {
    for (const [action, Icon] of Object.entries(VISUAL_ICONS)) {
      expect(typeof Icon, action).toMatch(/function|object/);
    }
    const html = wrap("en", <VisualEditor {...props("---\nkey: G\n---\n\n## Verse 1\n1\n")} />);
    // The coda tool: its icon (a circle crossed) beside its name.
    expect(html).toMatch(/class="cd-icon[^"]*"[^>]*><circle cx="12" cy="12" r="6"\/>.*?Coda</s);
    expect(html).toContain(">mf</text>");
  });

  it("R-13.3 each section says its bars, a repeat is one strip, Add a section closes the page", () => {
    const html = wrap(
      "en",
      <VisualEditor
        {...props(
          "## Verse\n1 | 4 | 6m | 5\n\n## Chorus\n4 | 1 | 5 | 1\n\n## Chorus\n@use Chorus 2x\n",
        )}
      />,
    );
    expect(html).toContain("4 bars");
    expect(html).toContain("Plays ×2");
    expect(html).toContain("Repeats the Chorus written above");
    expect(html).toMatch(/class="cd-chart__add"/);
  });

  it("R-13.8 a chart that opens with warnings is fixed in Text first", () => {
    const html = wrap("en", <VisualEditor {...props("## Verse\n1 | ??? | 4\n")} />);
    expect(html).toContain("Fix this chart in Text first");
    expect(html).toContain('href="/versions/00000000-0000-0000-0000-0000000000f1/edit"');
    expect(html).not.toContain("cd-chart--editable");
  });
});
