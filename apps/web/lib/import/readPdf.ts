// Reading a PDF's text in the browser with pdf.js (SPEC-10, T-1402, R-10.9): the file never
// leaves the person's device. pdf.js loads only when someone imports a PDF, and its worker comes
// from the app's own bundle, never a CDN.

import { hasText, MAX_BYTES, MAX_PAGES, pdfText, type PdfTextItem } from "./pdfLines";

export type PdfProblem = "not_pdf" | "too_big" | "too_many_pages" | "scanned" | "unreadable";

export async function readPdf(file: File): Promise<{ text: string } | { problem: PdfProblem }> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
    return { problem: "not_pdf" };
  if (file.size > MAX_BYTES) return { problem: "too_big" };
  try {
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerPort)
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PAGES) {
      await task.destroy();
      return { problem: "too_many_pages" };
    }
    const pages: PdfTextItem[][] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      pages.push(
        content.items.flatMap((item) =>
          "str" in item
            ? [
                {
                  str: item.str,
                  x: item.transform[4] ?? 0,
                  y: item.transform[5] ?? 0,
                  width: item.width,
                  height: item.height,
                },
              ]
            : [],
        ),
      );
    }
    await task.destroy();
    if (!hasText(pages)) return { problem: "scanned" };
    return { text: pdfText(pages) };
  } catch {
    return { problem: "unreadable" };
  }
}
