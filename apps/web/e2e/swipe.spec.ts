import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";
import { standNow } from "./flows";

const OPEN_ROAD = readFileSync(
  new URL("../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);

/** A finger on the chart, from one point to another, as the touch screen sends it. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let step = 1; step <= 5; step++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: from.x + ((to.x - from.x) * step) / 5, y: from.y + ((to.y - from.y) * step) / 5 },
      ],
    });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function swipes(page: Page, request: Parameters<typeof createVersion>[0]) {
  const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
  await page.goto(`/versions/${id}/stand`);
  // The section is the current one in the stack (R-03.12).
  const section = (name: string) =>
    standNow(page).getByRole("heading", { level: 2, name, exact: true });
  await expect(section("Intro")).toBeVisible();
  const box = (await page.getByRole("main").boundingBox())!;
  const y = box.y + box.height / 2;
  const middle = box.x + box.width / 2;

  // To the left: the next section; to the right: back.
  await drag(page, { x: middle + 100, y }, { x: middle - 100, y });
  await expect(section("Verse 1")).toBeVisible();
  await expect(page).toHaveURL(/\?s=2$/);
  await drag(page, { x: middle - 100, y }, { x: middle + 100, y });
  await expect(section("Intro")).toBeVisible();

  // A short, mostly vertical drag is a scroll, not a turn: the stack snaps back to the Intro.
  await drag(page, { x: middle, y: y + 60 }, { x: middle - 40, y: y - 60 });
  await expect(section("Intro")).toBeVisible();
}

test.describe("on an iPad", () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

  test("R-03.3 a sideways swipe on the chart turns the section on an iPad", async ({
    page,
    request,
  }) => {
    await swipes(page, request);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test("R-03.3 a sideways swipe on the chart turns the section on a phone", async ({
    page,
    request,
  }) => {
    await swipes(page, request);
  });
});
