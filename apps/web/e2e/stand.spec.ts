import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";
import { expectStandNow, gapUnderSongMap, standNow } from "./flows";

const OPEN_ROAD = readFileSync(
  new URL("../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);
const SECTIONS = ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus 2", "Bridge", "Last Chorus"];

// iPad in landscape (iPad Air 11", 1180 × 820 CSS pixels).
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

/** The current section is at the top of the stack, marked Now, and nothing scrolls sideways. */
async function expectWholeSection(page: Page, name: string) {
  await expectStandNow(page, name);
  const side = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(side, name).toBe(0);
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
  // On the last section Next goes back to the first (R-03.12).
  await expect(page.getByRole("link", { name: "Next", exact: true })).toHaveCount(0);
  await expect(page.getByText("End of the song")).toBeVisible();
  await expect(page.getByRole("link", { name: "From the top" })).toBeVisible();
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
  // Stage is set once, in View (T-2706).
  await page.getByRole("button", { name: "View options" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Stage" }).click();
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
        "## Intro\n1 | 4\n\n## Bridge 1\n4 | 5\n\n## Bridge 1\n4 | 5\n\n## Bridge 1\n4 | 5\n\n## Ending\n1\n",
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
    await expect(form.getByRole("link", { name: /Bridge 1.*2nd time/ })).toBeVisible();
    for (const name of ["Previous", "Next"]) {
      const box = await page.getByRole("link", { name, exact: true }).boundingBox();
      expect(Math.round(box?.height ?? 0), name).toBeGreaterThanOrEqual(56);
    }
  });
});

test("R-03.3 the clearer stand: one metronome control, the next section's notes, its times, Next at the bottom", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, {
    title: `Clear Stand ${Date.now()}`,
    content:
      "---\ntempo: 96\n---\n## Verse\n1 | 4 | 5 | 1\n## Bridge\n> MD: Build a little more each time.\n4 | 5 | 6m | 1\n## Bridges\n@use Bridge 3x\n",
  });
  await page.goto(`/versions/${id}/stand`);

  // T-2706: one line with Close, the song, View and the metronome; Beats is in View.
  const top = page.getByRole("navigation", { name: "Sections" });
  await expect(top.getByRole("link", { name: "Close" })).toBeVisible();
  await expect(top.getByRole("heading", { level: 1 })).toContainText("Clear Stand");
  const metronome = top.getByRole("group", { name: "Metronome" });
  const closeBox = await top.getByRole("link", { name: "Close" }).boundingBox();
  const metronomeBox = await metronome.boundingBox();
  expect(Math.abs((closeBox?.y ?? 0) - (metronomeBox?.y ?? 0))).toBeLessThan(20);
  await top.getByRole("button", { name: "View options" }).click();
  await expect(
    page.getByRole("dialog").getByRole("radiogroup", { name: "Beat slashes" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // T-2701: Play shows the tempo, the counter while it plays; the options sit beside it.
  await expect(metronome.getByRole("button", { name: "Play" })).toHaveText("96");
  await metronome.getByRole("button", { name: "Play" }).click();
  await expect(metronome.getByRole("button", { name: "Stop" })).toHaveText(/^\d \/ 4$/);
  await metronome.getByRole("button", { name: "Stop" }).click();
  await metronome.getByRole("button", { name: "Metronome options" }).click();
  await expect(page.getByRole("dialog")).toContainText("Count-in");
  await page.keyboard.press("Escape");

  // T-2703, R-03.12: the next section and its note are on screen before it comes, in its card.
  await expect(page.getByText("Next up:")).toContainText("Bridge");
  await expect(page.locator('.cd-stand-card[data-state="upcoming"]').first()).toContainText(
    "Build a little more each time.",
  );
  await expect(page.getByText("Build a little more each time.").first()).toBeInViewport();

  // T-2705: Next is at the bottom; T-2704: a section reused three times says so.
  const turn = page.getByRole("navigation", { name: "Previous and next" });
  await turn.getByRole("link", { name: "Next", exact: true }).click();
  await turn.getByRole("link", { name: "Next", exact: true }).click();
  await expectStandNow(page, "Bridges");
  await expect(standNow(page)).toContainText("3 times");
});

// Stand mode v2 (R-03.12): the current section and what follows it, stacked.
const STACK =
  "---\ntempo: 96\n---\n## Verse\n1 | 4 | 5 | 1\n## Chorus\n> MD: Big from here.\n4 | 5 | 6m | 1\n## Bridge\n6m | 5 | 4 | 4\n## Tag\n4 | 5\n";

for (const [device, viewport] of [
  ["an iPad in landscape", { width: 1180, height: 820 }],
  ["an iPad in portrait", { width: 820, height: 1180 }],
  ["a phone", { width: 393, height: 852 }],
] as const) {
  test(`R-03.12 on ${device}, the current section and the next one with its note are on screen`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    const id = await createVersion(request, { title: `Stack ${Date.now()}`, content: STACK });
    await page.goto(`/versions/${id}/stand`);
    await expectStandNow(page, "Verse");
    await expect(standNow(page)).toContainText("Now");
    const chorus = page.locator('.cd-stand-card[data-card="1"]');
    await expect(chorus).toHaveAttribute("data-state", "upcoming");
    await expect(chorus.getByText("Big from here.")).toBeInViewport();
    // A card keeps its size when it becomes the current one: only its color changes.
    const before = (await chorus.boundingBox())?.height;
    await page.keyboard.press("PageDown");
    await expectStandNow(page, "Chorus");
    expect((await chorus.boundingBox())?.height).toBe(before);
    await expect(page.locator('.cd-stand-card[data-card="0"]')).toHaveAttribute(
      "data-state",
      "past",
    );
  });
}

test("R-03.12 Next, a pedal, a tap on a card and a settled scroll each make a section current", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: `Stack ${Date.now()}`, content: STACK });
  await page.goto(`/versions/${id}/stand`);
  await expectStandNow(page, "Verse");
  await page
    .getByRole("navigation", { name: "Previous and next" })
    .getByRole("link", { name: "Next", exact: true })
    .click();
  await expectStandNow(page, "Chorus");
  await page.keyboard.press("PageDown");
  await expectStandNow(page, "Bridge");
  await page.locator('.cd-stand-card[data-card="0"]').click();
  await expectStandNow(page, "Verse");
  await expect(page).toHaveURL(new RegExp(`/versions/${id}/stand$`));
  // Scrolled with the finger (or a wheel) until the Bridge sits at the top, it becomes current.
  await page.getByRole("main").evaluate((stack) => {
    const bridge = stack.querySelector<HTMLElement>('[data-card="2"]');
    if (bridge)
      stack.scrollTop += bridge.getBoundingClientRect().top - stack.getBoundingClientRect().top;
  });
  await expectStandNow(page, "Bridge");
  await expect(page).toHaveURL(/\?s=3$/);
});

test.describe("R-03.12 with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("R-03.12 a section moves to the top at once", async ({ page, request }) => {
    const id = await createVersion(request, { title: `Stack ${Date.now()}`, content: STACK });
    await page.goto(`/versions/${id}/stand`);
    await expectStandNow(page, "Verse");
    await page.keyboard.press("PageDown");
    // No glide: the very next frame already has the Chorus at the top.
    const offset = await page.evaluate(
      () =>
        new Promise<number>((done) =>
          requestAnimationFrame(() => {
            const stack = document.querySelector("main");
            const chorus = document.querySelector('[data-card="1"]');
            done(
              Math.abs(
                (chorus?.getBoundingClientRect().top ?? 0) -
                  (stack?.getBoundingClientRect().top ?? 0),
              ),
            );
          }),
        ),
    );
    expect(offset).toBeLessThan(16);
  });
});
