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

test("R-03.5 Your versions is searched by title, and a row's icons open, edit and annotate it", async ({
  page,
}) => {
  const stamp = Date.now();
  await signUpAndConfirm(page, unique("mine"), "Milo Mine");
  await publish(page, `Rain Lantern ${stamp}`);
  const second = await publish(page, `Copper Kite ${stamp}`);

  await page.goto("/versions/mine");
  await page.getByLabel("Search your versions by title").fill("Copper Kite");
  await page.getByRole("button", { name: "Search" }).click();
  const rows = page.getByRole("main").getByRole("listitem");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(`Copper Kite ${stamp}`);

  // The actions are icons, named for the version.
  const row = rows.first();
  await expect(
    row.getByRole("link", { name: `Director's notes for Copper Kite ${stamp}` }),
  ).toHaveAttribute("href", `${second}/notes`);
  await row.getByRole("link", { name: `Edit Copper Kite ${stamp}` }).click();
  await expect(page).toHaveURL(new RegExp(`${second}/edit$`));

  // The row itself opens the version (R-02.10's rows, T-2406).
  await page.goto("/versions/mine?q=Copper%20Kite");
  await page.getByRole("main").getByText(`Copper Kite ${stamp}`).click();
  await expect(page).toHaveURL(new RegExp(`${second}$`));

  await page.goto("/versions/mine?q=Nothing%20Like%20This");
  await expect(page.getByText("None of your versions match.")).toBeVisible();
});
