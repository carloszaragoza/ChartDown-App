import { expect, test } from "@playwright/test";
import { signUpAndConfirm, unique } from "./flows";

test("T-3012 a chart written by hand opens in the visual editor: the notice asks first, then the bar is written", async ({
  page,
}) => {
  const title = `Harbor Lights ${Date.now()}`;
  await signUpAndConfirm(page, unique("visual"), "Vera Visual");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  // Written by hand: spacing the canonical text would change.
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1  |  4 | 5 | 1\n");
  await page.getByLabel("Studio recording").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);

  await page.getByRole("main").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("menuitem", { name: "Visual editor" }).click();
  await expect(page).toHaveURL(/\/visual$/);
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeDisabled();

  // R-13.1 the first change asks before the text is rewritten in its standard layout.
  await page.locator(".cd-chart__bar").first().locator("[data-line='chords']").click();
  await expect(page.getByRole("heading", { name: /standard layout/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // The bar is written in at once.
  const input = page.locator(".cd-chart__input").first();
  await expect(input).toBeFocused();
  await input.fill("6m");
  await input.press("Escape");
  await expect(page.locator(".cd-chart__bar").first()).toContainText("6");
  await expect(save).toBeEnabled();

  // T-3013 a bar line typed in the chords line ends the bar; the writing goes on in the next.
  await page.locator(".cd-chart__bar").first().locator("[data-line='chords']").click();
  await page.locator(".cd-chart__input").first().fill("6m7 '1/3 | 4");
  await expect(page.locator(".cd-chart__input")).toHaveValue("4");
  await page.keyboard.press("Escape");
  const bars = page.locator(".cd-chart__bar");
  await expect(bars.nth(0)).toContainText("1/3");
  await expect(bars.nth(0)).not.toContainText("4");
  await expect(bars.nth(1)).toContainText("4");
});
