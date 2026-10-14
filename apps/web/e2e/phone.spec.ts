import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";

const OPEN_ROAD = readFileSync(
  new URL("../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);

// iPhone 16 (393 × 852 CSS pixels), held both ways (R-03.8).
const PORTRAIT = { width: 393, height: 852 };
const LANDSCAPE = { width: 852, height: 393 };

/** The tops of the first row's bars, in stand mode's current section. */
async function firstRowTops(page: Page): Promise<number[]> {
  return page
    .getByRole("main")
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
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2, name: "Intro" }),
    ).toBeVisible();

    const [first, second, third, fourth] = await firstRowTops(page);
    expect(second).toBe(first);
    expect(fourth).toBe(third);
    expect(third).toBeGreaterThan(first ?? 0);
    await expectNoSidewaysScroll(page);
  });
});

test.describe("on an iPhone 16 in landscape", () => {
  test.use({ viewport: LANDSCAPE, hasTouch: true, isMobile: true });

  test("R-03.8 a row of four bars stays on one line in stand mode", async ({ page, request }) => {
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}/stand`);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2, name: "Intro" }),
    ).toBeVisible();

    const tops = await firstRowTops(page);
    expect(tops).toHaveLength(4);
    expect(new Set(tops).size).toBe(1);
    await expectNoSidewaysScroll(page);
  });
});
