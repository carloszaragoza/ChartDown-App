import { expect, test, type Page } from "@playwright/test";
import { signUpAndConfirm, unique } from "./flows";

const ANDROID = { width: 360, height: 780 };

/** The page has one column: the region is as wide as the page's content, and nothing scrolls sideways. */
async function oneColumn(page: Page, region: string) {
  const box = await page.getByRole("region", { name: region }).boundingBox();
  expect(box?.width ?? 0, region).toBeGreaterThan(ANDROID.width - 64);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("the app on an Android phone", () => {
  test.use({ viewport: ANDROID, hasTouch: true, isMobile: true });

  test("R-03.9 pages with a side panel read in one column, the main content first", async ({
    page,
  }) => {
    // Signing up checks the side navigation, which a phone keeps in its drawer: sign up on an
    // iPad, then hold the phone.
    await page.setViewportSize({ width: 1180, height: 820 });
    await signUpAndConfirm(page, unique("phoneapp"), "Pia Phone");
    await page.setViewportSize(ANDROID);
    // Home: the first steps, then the help that sat beside them on an iPad.
    await page.goto("/");
    const help = page.getByRole("region", { name: "Help" });
    await expect(help).toBeVisible();
    const main = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect((await help.boundingBox())?.y ?? 0).toBeGreaterThan(main?.y ?? 0);
    await oneColumn(page, "Help");

    // Bands: the list, then the form to create one, full width.
    await page.goto("/bands");
    await oneColumn(page, "Create a band");
  });

  test("R-03.9 a long choice becomes a menu, and nothing is cut short", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page.getByRole("combobox", { name: "Source" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Source" })).toHaveCount(0);
    const cut = await page.evaluate(
      () =>
        [...document.querySelectorAll("button, a, [role=radio]")].filter((element) => {
          // Only what a person sees: the skip link is hidden until it gets the focus.
          const box = element.getBoundingClientRect();
          return box.width > 2 && box.height > 2 && element.scrollWidth > element.clientWidth + 1;
        }).length,
    );
    expect(cut).toBe(0);
  });
});
