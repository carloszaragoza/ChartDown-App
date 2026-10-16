import { parse } from "chartdown";
import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";
import { Editor, Warnings } from "./Editor";

vi.mock("./actions", () => ({ saveChart: () => undefined }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));

const wrap = (locale: "en" | "es", node: React.ReactNode) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );

describe("R-03.1 the chart editor", () => {
  it("R-03.1 the warnings list shows each warning with its line", () => {
    const chart = parse("## Verse\n1 | 4\n\n5 | ??? | 1\n");
    expect(chart.warnings.length).toBeGreaterThan(0);
    const html = wrap("en", <Warnings warnings={chart.warnings} />);
    expect(html).toContain("Line 4:");
    expect(html).toContain("Can’t read “???”");
    expect(html).toMatch(/role="button"|<button/);
    expect(wrap("es", <Warnings warnings={chart.warnings} />)).toContain("Línea 4:");
    expect(wrap("en", <Warnings warnings={[]} />)).toContain("No warnings");
  });

  it("R-03.1 the editor shows the text beside a preview of the parsed chart", () => {
    const html = wrap(
      "en",
      <Editor
        phone={false}
        versionId="00000000-0000-0000-0000-0000000000f1"
        title="Lantern Bay"
        visibility="public"
        revisionId="00000000-0000-0000-0000-0000000000d1"
        content={"## Bridge\n4 | 5 | 6m | 1\n"}
        source="Own arrangement"
        revisionNumber={7}
        savedAt={new Date(Date.now() - 2 * 60_000).toISOString()}
      />,
    );
    expect(html).toContain("Lantern Bay");
    expect(html).toMatch(/<textarea/);
    expect(html).toContain('aria-label="Preview"');
    expect(html).toMatch(/<h[23][^>]*>[^<]*Bridge/);
    // Nothing changed yet, so there is nothing to save.
    expect(html).toMatch(
      /<button[^>]*(aria-disabled="true"|disabled)[^>]*>(?:(?!<\/button>).)*Save/s,
    );
    // The header as designed: source, revision and when, Public or Private, History.
    expect(html).toContain("Own arrangement · Revision 7 · saved 2 minutes ago");
    expect(html).toMatch(
      /role="radiogroup"[^>]*aria-label="Visibility"|aria-label="Visibility"[^>]*role="radiogroup"/,
    );
    expect(html).toContain('href="/versions/00000000-0000-0000-0000-0000000000f1/history"');
    expect(html).toMatch(/ChartDown (<!-- -->)?0\.8/);
  });
});
