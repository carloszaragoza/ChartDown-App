import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
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
