import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";
import { signUpAndConfirm, unique } from "./flows";

const MORNING_LIGHT = readFileSync(
  new URL("../../../fixtures/import/morning-light.txt", import.meta.url),
  "utf8",
);

test("R-10.13 a pasted chord sheet becomes a draft to check, saved only when published", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("importer"), "Ivy Import");
  await page.goto("/versions/new");
  await page.getByRole("link", { name: "Import a chord sheet" }).click();
  await expect(page).toHaveURL(/\/versions\/new\/import$/);

  // R-10.10: converting waits for the rights confirmation.
  await page.locator("textarea").first().fill(MORNING_LIGHT);
  const convert = page.getByRole("button", { name: "Convert to a chart" });
  await expect(convert).toBeDisabled();
  await page.getByText("I have the right to use this chord sheet.").click();
  await convert.click();

  // R-10.8: the draft and what to check; the lyrics are gone but for the landmarks (R-10.7).
  await expect(page.getByRole("heading", { name: "Check the import" })).toBeVisible();
  await expect(page.getByText("Key E, as the sheet says.")).toBeVisible();
  await expect(page.getByText(/rows have bars we proposed/)).toBeVisible();
  await expect(page.locator("input[name=title]")).toHaveValue("Morning Light");
  const draft = await page.locator("textarea[name=content]").inputValue();
  expect(draft).toContain("## Verse 1");
  expect(draft).toContain('1 "Morning comes slow over" | 5/7');
  expect(draft).not.toContain("Light on the water");
  expect(draft).not.toMatch(/copyright|ccli/i);
  await expect(page).toHaveURL(/\/versions\/new\/import$/);

  // Publishing saves it, with its source (R-02.2).
  await page.getByText("Live", { exact: true }).click();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { level: 1, name: "Morning Light" })).toBeVisible();
  await expect(page.locator("#section-2")).toContainText("Verse 1");
});

test("R-10.9 a PDF is read in the browser: its text fills the sheet, and nothing is uploaded", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("pdfimporter"), "Pablo Pdf");
  await page.goto("/versions/new/import");
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") sent.push(request.url());
  });
  await page
    .locator("input[type=file]")
    .setInputFiles(
      new URL("../../../fixtures/import/lantern-bay-minor.pdf", import.meta.url).pathname,
    );
  await expect(page.getByText("Read lantern-bay-minor.pdf.", { exact: false })).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue(/Lantern Bay[\s\S]*Key: Em/);
  expect(sent).toEqual([]);

  // R-10.5: converted in E minor, tonic-based.
  await page.getByText("I have the right to use this chord sheet.").click();
  await page.getByRole("button", { name: "Convert to a chart" }).click();
  await expect(page.getByText("Key Em, as the sheet says.")).toBeVisible();
  await expect(page.locator("textarea[name=content]")).toHaveValue(
    /b6 "Shine, shine, Lantern Bay" \| b3/,
  );
});

test("R-10.11 a scanned PDF is turned away with a clear message, and nothing is created", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("scanner"), "Sara Scan");
  await page.goto("/versions/new/import");
  await page
    .locator("input[type=file]")
    .setInputFiles(new URL("../../../fixtures/import/scanned-sheet.pdf", import.meta.url).pathname);
  // Next.js keeps its own empty route announcer as an alert too.
  await expect(
    page.getByRole("alert").filter({ hasText: "This PDF is a scan or a photo" }),
  ).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue("");
});

test("R-10.12 a sheet whose song is already in the catalog offers adding a version to it", async ({
  page,
  request,
}) => {
  const title = `Cedar Hollow ${Date.now()}`;
  await createVersion(request, { title, content: "## Verse\n1 | 4\n" });
  await signUpAndConfirm(page, unique("duplicate"), "Dana Dup");
  await page.goto("/versions/new/import");
  await page.locator("textarea").first().fill(`${title}\nKey: G\n\nVerse\nG    C    D    G\n`);
  await page.getByText("I have the right to use this chord sheet.").click();
  await page.getByRole("button", { name: "Convert to a chart" }).click();
  await expect(page.getByText(`“${title}” is already in the catalog.`)).toBeVisible();
  await page.getByRole("button", { name: "Add my version to that song" }).click();
  // The draft stays; it is now a version of that song.
  await expect(page.locator("input[name=songId]")).toHaveCount(1);
  await expect(page.locator("textarea[name=content]")).toHaveValue(/## Verse\n1 \| 4 \| 5 \| 1/);
});

test("R-10.10 converting waits until the person confirms they may use the sheet", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("rights"), "Rita Rights");
  await page.goto("/versions/new/import");
  await page.locator("textarea").first().fill("Verse\nG    C    D    G\n");
  const convert = page.getByRole("button", { name: "Convert to a chart" });
  await expect(convert).toBeDisabled();
  await page.getByText("I have the right to use this chord sheet.").click();
  await expect(convert).toBeEnabled();
});

test("R-03.10 New version never opens on a blank chart: a starter, the letters hint and the import", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("firstchart"), "Fran First");
  await page.goto("/versions/new?song=new");
  await expect(page.locator("textarea[name=content]")).toHaveValue(/key: G[\s\S]*## Verse/);
  await expect(page.getByText(/or as letters \(G \| C D \| Em\)/)).toBeVisible();
  await page.getByRole("link", { name: "Import a chord sheet" }).first().click();
  await expect(page).toHaveURL(/\/versions\/new\/import$/);
});

test("R-10.8 a line the review names is marked beside the chart, and choosing it selects the line", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("lines"), "Lina Lines");
  await page.goto("/versions/new/import");
  await page.locator("textarea").first().fill(MORNING_LIGHT);
  await page.getByText("I have the right to use this chord sheet.").click();
  await page.getByRole("button", { name: "Convert to a chart" }).click();
  const line = page.locator(".cd-lines").getByRole("button", { name: "Go to line 10" });
  await expect(line).toHaveAttribute("data-flag", "review");
  await page
    .getByRole("group", { name: "Lines to check" })
    .getByRole("button", { name: "Go to line 10" })
    .click();
  const selected = await page.evaluate(() => {
    const field = document.querySelector<HTMLTextAreaElement>("textarea[name=content]");
    return field ? field.value.slice(field.selectionStart, field.selectionEnd) : "";
  });
  expect(selected).toBe('1 "Morning comes slow over" | 5/7');
});
