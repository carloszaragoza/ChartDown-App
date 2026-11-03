import { expect, test, type Page } from "@playwright/test";
import { signUpAndConfirm, unique } from "./flows";

// Original example songs only; no lyrics (CLAUDE.md).
async function publish(page: Page, title: string) {
  await page.goto(`/versions/new?song=new&q=${encodeURIComponent(title)}`);
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}

test("R-03.1 the Chart editor list filters as you type, and a row opens the editor", async ({
  page,
}) => {
  const stamp = Date.now();
  await signUpAndConfirm(page, unique("mine"), "Milo Mine");
  await publish(page, `Rain Lantern ${stamp}`);
  const second = await publish(page, `Copper Kite ${stamp}`);

  await page.goto("/versions/mine");
  await expect(page.getByRole("heading", { level: 1, name: "Chart editor" })).toBeVisible();
  await page.getByLabel("Search your versions by title").fill("Copper Kite");
  const rows = page.getByRole("main").getByRole("listitem");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(`Copper Kite ${stamp}`);
  await expect(rows).toContainText("Key G · 4/4 · Tempo 72");

  // The row opens the editor. Open, Edit and Director's notes are not buttons on it.
  const row = rows.first();
  await expect(row.getByRole("img", { name: "Public" })).toBeVisible();
  await expect(row.getByText("Public", { exact: true })).toHaveCount(0);
  await expect(row.getByRole("link", { name: /Director's notes/ })).toHaveCount(0);
  await expect(row.getByRole("link", { name: /^Open / })).toHaveCount(0);
  await expect(row.getByRole("link", { name: /^Edit / })).toHaveCount(0);
  await row.getByRole("link", { name: `Copper Kite ${stamp}` }).click();
  await expect(page).toHaveURL(new RegExp(`${second}/edit$`));

  await page.goto("/versions/mine?q=Nothing%20Like%20This");
  await expect(page.getByText("None of your versions match.")).toBeVisible();
});
