import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";
import { standNow } from "./flows";

const OPEN_ROAD = readFileSync(
  new URL("../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);

// iPhone 16 (393 × 852 CSS pixels), held both ways (R-03.8).
const PORTRAIT = { width: 393, height: 852 };
const LANDSCAPE = { width: 852, height: 393 };

/** The tops of the first row's bars, in stand mode's current section. */
async function firstRowTops(page: Page): Promise<number[]> {
  return standNow(page)
    .locator(".cd-chart__bars")
    .first()
    .evaluate((row) =>
      Array.from(row.children, (bar) => Math.round(bar.getBoundingClientRect().top)),
    );
}

/** Nothing scrolls sideways: not the page, not a row. */
async function expectNoSidewaysScroll(page: Page) {
  const sideways = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth - window.innerWidth,
    rows: Array.from(document.querySelectorAll(".cd-chart__scroll")).filter(
      (row) => row.scrollWidth > row.clientWidth + 1,
    ).length,
  }));
  expect(sideways).toEqual({ page: 0, rows: 0 });
}

test.describe("on an iPhone 16 in portrait", () => {
  test.use({ viewport: PORTRAIT, hasTouch: true, isMobile: true });

  test("R-03.8 a row of four bars reads 2 + 2 in stand mode and nothing scrolls sideways", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}/stand?view=letters&beats=always`);
    await expect(standNow(page).getByRole("heading", { level: 2, name: "Intro" })).toBeVisible();

    const [first, second, third, fourth] = await firstRowTops(page);
    expect(second).toBe(first);
    expect(fourth).toBe(third);
    expect(third).toBeGreaterThan(first ?? 0);
    await expectNoSidewaysScroll(page);
  });

  test("R-03.8 stand mode puts the chart first: one top bar, the View sheet, Next", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}/stand`);
    const current = standNow(page);
    await expect(current.getByRole("heading", { level: 2, name: "Intro" })).toBeVisible();

    // The section's first row is on the first screen, under one bar and the song form strip.
    const firstRow = current.locator(".cd-chart__bars").first();
    const top = await firstRow.evaluate((row) => row.getBoundingClientRect().top);
    expect(top).toBeLessThan(PORTRAIT.height / 2);
    await expect(page.getByText("Section 1 of 7")).toBeVisible();
    // The display choices wait in the View sheet.
    await expect(page.getByRole("link", { name: "Letters" })).toBeHidden();
    await page.getByRole("button", { name: "View options" }).click();
    const sheet = page.getByRole("dialog", { name: "View options" });
    await expect(sheet.getByRole("link", { name: "Letters" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Stage" })).toBeVisible();
    await sheet.getByRole("link", { name: "Letters" }).click();
    await expect(page).toHaveURL(/view=letters/);
    await page.keyboard.press("Escape");

    // Next moves on; on a phone the turn buttons are 48 px (R-03.9).
    const next = page.getByRole("link", { name: "Next", exact: true });
    const size = await next.boundingBox();
    expect(size?.height).toBeGreaterThanOrEqual(48);
    await next.click();
    await expect(current.getByRole("heading", { level: 2, name: "Verse 1" })).toBeVisible();
    await expect(page.getByText("Section 2 of 7")).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});

test.describe("the version page on an iPhone 16", () => {
  test.use({ viewport: PORTRAIT, hasTouch: true, isMobile: true });

  test("R-03.8 the version page shows the first row on the first screen, with the song form as a strip", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}`);
    const form = page.getByRole("navigation", { name: "Song form" });
    await expect(form.getByRole("link")).toHaveCount(7);
    // One strip: every section on the same line, scrolling inside itself, once the page knows
    // it is on a phone.
    await expect
      .poll(async () => {
        const tops = await form
          .getByRole("link")
          .evaluateAll((links) =>
            links.map((link) => Math.round(link.getBoundingClientRect().top)),
          );
        return new Set(tops).size;
      })
      .toBe(1);
    const firstRow = await page
      .locator(".cd-chart__bars")
      .first()
      .evaluate((row) => row.getBoundingClientRect().top);
    expect(firstRow).toBeLessThan(PORTRAIT.height);
    await expectNoSidewaysScroll(page);
  });
});

test.describe("on an iPhone 16 in landscape", () => {
  test.use({ viewport: LANDSCAPE, hasTouch: true, isMobile: true });

  test("R-03.8 a row of four bars stays on one line in stand mode", async ({ page, request }) => {
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}/stand`);
    await expect(standNow(page).getByRole("heading", { level: 2, name: "Intro" })).toBeVisible();

    const tops = await firstRowTops(page);
    expect(tops).toHaveLength(4);
    expect(new Set(tops).size).toBe(1);
    await expectNoSidewaysScroll(page);
  });

  test("R-03.8 held sideways, the song form joins the top bar and the bars get the height", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}/stand?s=2`);
    const current = standNow(page);
    await expect(current.getByRole("heading", { level: 2, name: "Verse 1" })).toBeVisible();
    // The server cannot tell the phone is sideways: the screen decides once the page is drawn.
    const topOf = (locator: ReturnType<Page["locator"]>) =>
      locator.evaluate((element) => element.getBoundingClientRect().top);
    await expect
      .poll(
        async () =>
          Math.abs(
            (await topOf(page.getByRole("navigation", { name: "Song form" }))) -
              (await topOf(page.getByRole("link", { name: "Next", exact: true }))),
          ),
        { timeout: 5000 },
      )
      .toBeLessThan(8);
    expect(await topOf(current.locator(".cd-chart__bars").first())).toBeLessThan(
      LANDSCAPE.height * 0.6,
    );
  });
});
