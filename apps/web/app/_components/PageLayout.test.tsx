import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageLayout } from "./PageLayout";

const page = (phone: boolean, firstOnPhone = false) =>
  renderToString(
    <PageLayout
      phone={phone}
      height="auto"
      padding={8}
      panel={{
        side: "end",
        width: 340,
        role: "region",
        label: "Lineup",
        firstOnPhone,
        children: <p>THE PANEL</p>,
      }}
      content={<p>THE SONGS</p>}
    />,
  );

describe("T-2207 pages with a side panel on a phone", () => {
  it("R-03.9 on a phone the panel follows the main content, in one column", () => {
    const html = page(true);
    expect(html.indexOf("THE SONGS")).toBeLessThan(html.indexOf("THE PANEL"));
    expect(html).toMatch(/<section aria-label="Lineup" role="region">/);
    expect(html).not.toContain("astryx-layout-panel");
  });

  it("R-03.9 a panel the page is for (the editor's text) comes first on a phone", () => {
    const html = page(true, true);
    expect(html.indexOf("THE PANEL")).toBeLessThan(html.indexOf("THE SONGS"));
  });

  it("R-03.9 on an iPad or a desktop the panel stays beside the content", () => {
    expect(page(false)).toContain("astryx-layout-panel");
  });
});
