import { expect, test } from "@playwright/test";
import { signOut, signUpAndConfirm, unique } from "./flows";

test("R-02.7 the fork shows “Based on the version by…”", async ({ page }) => {
  // Ana publishes a version.
  const title = `Willow Road ${Date.now()}`;
  await signUpAndConfirm(page, unique("original"), "Ana Original");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill("## Bridge\n4 | 5 | 6m | 1\n");
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const original = new URL(page.url()).pathname;
  await expect(page.getByRole("button", { name: "Fork" })).toHaveCount(0);
  await page.goto("/");
  await signOut(page);

  // Ben opens it: Fork, but no History (R-02.6).
  await signUpAndConfirm(page, unique("forker"), "Ben Forker");
  await page.goto(original);
  await expect(page.getByRole("link", { name: "History" })).toHaveCount(0);
  await page.getByRole("button", { name: "Fork" }).click();

  // The copy has its own address; wait until the page has moved there.
  await page.waitForURL(
    (url) => /^\/versions\/[0-9a-f-]{36}$/.test(url.pathname) && url.pathname !== original,
  );
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Arrangement by Ben Forker")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bridge" })).toBeVisible();
  const basedOn = page.getByRole("link", { name: "Based on the version by Ana Original" });
  await expect(basedOn).toBeVisible();

  // The copy is Ben's, with its own history.
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("listitem")).toContainText("Revision 1");

  await page.goBack();
  await page.getByRole("link", { name: "Based on the version by Ana Original" }).click();
  await expect(page).toHaveURL(new RegExp(`${original}$`));
  await expect(page.getByText("Arrangement by Ana Original")).toBeVisible();
});
