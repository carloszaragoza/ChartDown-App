import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { importSheet } from "./convert";
import { hasText, pageLines, pdfText, type PdfTextItem } from "./pdfLines";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../../../../fixtures/import/${name}`, import.meta.url)));

/** A PDF's text items, as the browser reads them, with pdf.js in Node. */
async function items(name: string): Promise<PdfTextItem[][]> {
  const pdf = await getDocument({ data: fixture(name), useSystemFonts: true }).promise;
  const pages: PdfTextItem[][] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent();
    pages.push(
      content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
              },
            ]
          : [],
      ),
    );
  }
  return pages;
}

describe("T-1402 reading a PDF's text", () => {
  it("R-10.1 a text PDF gives the same draft as the same sheet pasted", async () => {
    for (const name of ["morning-light", "lantern-bay-minor", "harbor-lights-bars"]) {
      const fromPdf = importSheet(pdfText(await items(`${name}.pdf`)), {
        style: "numbers",
        landmarkWords: 4,
      });
      const pasted = importSheet(
        readFileSync(new URL(`../../../../fixtures/import/${name}.txt`, import.meta.url), "utf8"),
        {
          style: "numbers",
          landmarkWords: 4,
        },
      );
      expect(fromPdf.source, name).toBe(pasted.source);
    }
  });

  it("R-10.11 a scanned PDF has no text to read, and is turned away", async () => {
    expect(hasText(await items("scanned-sheet.pdf"))).toBe(false);
    expect(hasText(await items("morning-light.pdf"))).toBe(true);
  });

  it("R-10.4 a chord stays in the column it was printed in, over its word", () => {
    const lines = pageLines([
      { str: "G", x: 100, y: 700, width: 7, height: 12 },
      { str: "C", x: 170, y: 700, width: 7, height: 12 },
      { str: "First line of the song", x: 100, y: 684, width: 154, height: 12 },
    ]);
    expect(lines).toEqual(["G         C", "First line of the song"]);
  });
});
