import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";
import { gapUnderSongMap } from "./flows";

const OPEN_ROAD = readFileSync(
  new URL("../../../packages/core/fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);
const SECTIONS = ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus 2", "Bridge", "Last Chorus"];

// iPad in landscape (iPad Air 11", 1180 × 820 CSS pixels).
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

/** The current section is whole on screen: nothing to the side, nothing below, no zoom. */
async function expectWholeSection(page: Page, name: string) {
  const current = page.getByRole("main");
  await expect(current.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  const fits = await current.evaluate((area) => ({
    below: area.scrollHeight - area.clientHeight,
    side: document.documentElement.scrollWidth - window.innerWidth,
    bottom: area.getBoundingClientRect().bottom - window.innerHeight,
  }));
  expect(fits, name).toEqual({ below: 0, side: 0, bottom: expect.any(Number) });
  expect(fits.bottom, name).toBeLessThanOrEqual(0);
}

test("R-03.3 every section reads without zooming on an iPad in landscape", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
  await page.goto(`/versions/${id}`);
  await page.getByRole("main").getByRole("link", { name: "Stand mode" }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${id}/stand$`));
  await page.evaluate(() => Object.assign(window, { stillHere: true }));

  // Next, the right arrow (as a pedal sends it), and back with the left arrow.
  for (const [index, name] of SECTIONS.entries()) {
    await expectWholeSection(page, name);
    await expect(page.getByText(`Section ${index + 1} of 7`)).toBeVisible();
    if (index === SECTIONS.length - 1) break;
    if (index % 2 === 0) await page.getByRole("link", { name: "Next", exact: true }).click();
    else await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(new RegExp(`\\?s=${index + 2}$`));
  }
  await expect(page.getByRole("link", { name: "Next", exact: true })).toHaveCount(0);
  await expect(page.getByText("End of the song")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expectWholeSection(page, "Bridge");

  // The song map jumps straight to a section; nothing reloads.
  await page
    .getByRole("navigation", { name: "Song form" })
    .getByRole("link", { name: /^Chorus,/ })
    .click();
  await expectWholeSection(page, "Chorus");
  await expect(page).toHaveURL(/\?s=3$/);
  expect(await page.evaluate(() => "stillHere" in window)).toBe(true);

  // The stage theme changes the colors, never the sizes.
  const size = () =>
    page.getByRole("main").evaluate((area) => {
      const chord = area.querySelector(".cd-chord");
      return chord ? getComputedStyle(chord).fontSize : "";
    });
  const background = () =>
    page.locator("[data-stand]").evaluate((stand) => getComputedStyle(stand).backgroundColor);
  const lightSize = await size();
  const lightBackground = await background();
  await page.getByRole("link", { name: "Stage" }).click();
  await expect(page).toHaveURL(/theme=stage/);
  await expectWholeSection(page, "Chorus");
  expect(await size()).toBe(lightSize);
  expect(await background()).not.toBe(lightBackground);
});

for (const [orientation, viewport] of [
  ["portrait", { width: 820, height: 1180 }],
  ["landscape", { width: 1180, height: 820 }],
] as const) {
  test(`R-03.3 on an iPad in ${orientation}, the section sits right under the song map`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
    await page.goto(`/versions/${id}/stand?s=4`);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2, name: "Verse 2" }),
    ).toBeVisible();
    // F-001: no empty space between the song map and the section to read.
    expect(await gapUnderSongMap(page)).toBeLessThan(40);
  });
}

test.describe("on an iPad, during a performance", () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

  test("T-1302 the song form and Previous / Next are at least 56 px, with room between sections", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, {
      title: `Tall Pines ${Date.now()}`,
      content:
        "## Intro\n1 | 4\n\n## Bridge\n4 | 5\n\n## Bridge\n4 | 5\n\n## Bridge\n4 | 5\n\n## Ending\n1\n",
    });
    await page.goto(`/versions/${id}/stand?s=2`);
    const form = page.getByRole("navigation", { name: "Song form" });
    const sections = form.getByRole("link");
    await expect(sections).toHaveCount(5);
    const boxes = await Promise.all((await sections.all()).map((link) => link.boundingBox()));
    for (const box of boxes) {
      expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(56);
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    for (let index = 1; index < boxes.length; index++) {
      const [before, after] = [boxes[index - 1], boxes[index]];
      if (before && after && Math.abs(before.y - after.y) < 1)
        expect(Math.round(after.x - (before.x + before.width))).toBeGreaterThanOrEqual(8);
    }
    // The current section is marked, and a repeated one says which time it is.
    await expect(form.locator('[aria-current="true"]')).toHaveCount(1);
    await expect(form.getByRole("link", { name: /Bridge.*2nd time/ })).toBeVisible();
    for (const name of ["Previous", "Next"]) {
      const box = await page.getByRole("link", { name, exact: true }).boundingBox();
      expect(Math.round(box?.height ?? 0), name).toBeGreaterThanOrEqual(56);
    }
  });
});
