import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";

// Two bars of 4/4 at 240 bpm: a beat every quarter second, so the test is short.
const FAST = "---\ntempo: 240\n---\n## Verse\n1 | 4 1\n## Chorus\n5 | 1\n";

test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

test("R-11.3 Play pulses on the current bar with a beat counter, then moves to the next bar", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}/stand`);
  const current = page.getByRole("main");
  const now = current.locator('[aria-current="step"]');

  await page.getByRole("button", { name: "Play" }).click();
  await expect(now).toHaveCount(1);
  await expect(page.getByText(/^[1-4] \/ 4$/)).toBeVisible();
  // The first bar, then the second.
  const bars = current.getByRole("group");
  await expect(bars.first()).toHaveAttribute("aria-current", "step");
  await expect(bars.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
});

test("R-11.4 playing, stand mode moves to the next section on its own", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}/stand`);
  await page.getByRole("button", { name: "Play" }).click();
  await expect(
    page.getByRole("main").getByRole("heading", { level: 2, name: "Chorus" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/\?s=2$/);
});

test("R-11.1 a chart with no tempo asks for one before it plays", async ({ page, request }) => {
  const id = await createVersion(request, { title: "No Tempo", content: "## A\n1 | 4\n" });
  await page.goto(`/versions/${id}/stand`);
  await page.getByRole("button", { name: "Play" }).click();
  const ask = page.getByRole("dialog");
  await expect(ask.getByText("This chart has no tempo.", { exact: false })).toBeVisible();
  await ask.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("main").locator('[aria-current="step"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("main").locator('[aria-current="step"]')).toHaveCount(0);
});

test("R-11.3 the version page plays too, from the song's start, with the counter", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}`);
  await page.getByRole("button", { name: "Play" }).click();
  // The page's first bar; the display choices are a group too.
  await expect(page.locator(".cd-chart__bar").first()).toHaveAttribute("aria-current", "step");
  await expect(page.getByText(/^[1-4] \/ 4$/)).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
});
