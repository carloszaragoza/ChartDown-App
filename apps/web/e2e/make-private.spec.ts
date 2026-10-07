import { expect, test } from "@playwright/test";
import { signOut, signUpAndConfirm, unique } from "./flows";

test("R-02.4 making a version private keeps a frozen public version", async ({ page }) => {
  const title = `Salt Marsh ${Date.now()}`;
  await signUpAndConfirm(page, unique("private"), "Ana Private");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill("## Outro\n1 | 5 | 4 | 1\n");
  await page.getByLabel("Acoustic").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const original = new URL(page.url()).pathname;

  await page.getByRole("link", { name: "Make private" }).click();
  await expect(page.getByText("This cannot be undone.")).toBeVisible();
  await expect(page.getByText("under the name Ana Private")).toBeVisible();
  await page.getByRole("button", { name: "Make private" }).click();

  // The owner lands on their private copy, with the same chart.
  await page.waitForURL(
    (url) => /^\/versions\/[0-9a-f-]{36}$/.test(url.pathname) && url.pathname !== original,
  );
  const copy = new URL(page.url()).pathname;
  await expect(page.getByText("Private", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outro" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make private" })).toHaveCount(0);

  // The public version is frozen: still the owner's, but nothing to change.
  await page.goto(original);
  await expect(page.getByText("Frozen public version")).toBeVisible();
  await expect(page.getByRole("link", { name: "Make private" })).toHaveCount(0);

  // A visitor still reads the public version, never the private copy.
  await page.goto("/");
  await signOut(page);
  await page.goto(original);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Frozen public version")).toBeVisible();
  await expect(page.getByText("Arrangement by Ana Private")).toBeVisible();
  expect((await page.goto(copy))?.status()).toBe(404);
});
