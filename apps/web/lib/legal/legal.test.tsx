import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blocks, Markdown } from "./Markdown";
import { LEGAL_TEXTS, TERMS_VERSION } from "./texts";

describe("T-1202 the terms and the privacy notice", () => {
  it("T-1202 reads headings, paragraphs, lists, bold and italics, and nothing as HTML", () => {
    expect(blocks("# Title\n\n## 1. Part\n\nOne\nline.\n\n- a\n- **b**")).toEqual([
      { type: "h1", text: "Title" },
      { type: "h2", text: "1. Part" },
      { type: "p", text: "One line." },
      { type: "ul", items: ["a", "**b**"] },
    ]);
    const html = renderToString(<Markdown text={"Say **hi** and _bye_ <script>x</script>"} />);
    expect(html).toContain("<strong>hi</strong>");
    expect(html).toContain("<em>bye</em>");
    expect(html).not.toContain("<script>");
  });

  it("T-1202 both texts exist in both languages, with the contact email and no placeholder", () => {
    for (const document of ["terms", "privacy"] as const) {
      for (const language of ["en", "es"] as const) {
        const text = LEGAL_TEXTS[document][language];
        expect(text, `${document}.${language}`).toContain("contact@chartdown.app");
        expect(text, `${document}.${language}`).not.toMatch(/\[contact email\]/);
        // The interface never abbreviates the music director (CLAUDE.md).
        expect(text, `${document}.${language}`).not.toMatch(/\bMD\b/);
      }
    }
    expect(LEGAL_TEXTS.terms.es).toContain("traducción");
    expect(TERMS_VERSION).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it("T-1202 public versions are CC0, and deleted accounts leave them credited to ChartDown", () => {
    expect(LEGAL_TEXTS.terms.en).toContain("**CC0**");
    expect(LEGAL_TEXTS.terms.en).toContain("credited to “ChartDown”");
    expect(LEGAL_TEXTS.privacy.en).toContain("**Resend:**");
  });
});
