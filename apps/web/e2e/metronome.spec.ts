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

test("R-11.15 choosing the section that plays repeats it; the screen stays on what sounds", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}/stand`);
  const current = page.getByRole("main");
  await page.getByRole("button", { name: "Play" }).click();
  const form = page.getByRole("navigation", { name: "Song form" });
  // The band is told to repeat the Verse.
  await form.getByRole("link", { name: /^Verse,/ }).click();
  await expect(page.getByText("Verse, again")).toBeVisible();
  await expect(form.getByRole("link", { name: /plays next/ })).toHaveCount(1);
  // The Verse ends and starts again; the Chorus is next once more.
  await expect(page.getByText("Next: Chorus", { exact: false })).toBeVisible({ timeout: 5000 });
  await expect(current.getByRole("heading", { level: 2, name: "Verse" })).toBeVisible();
  await expect(current.getByRole("group").first()).toHaveAttribute("aria-current", "step");

  // Queued, the Chorus is cancelled by choosing it again.
  await form.getByRole("link", { name: /^Chorus,/ }).click();
  await expect(form.getByRole("link", { name: /plays next/ })).toHaveCount(1);
  await form.getByRole("link", { name: /^Chorus,/ }).click();
  await expect(form.getByRole("link", { name: /plays next/ })).toHaveCount(0);
});

test("R-11.2 tapping a bar and pressing Play starts there, then the next bar follows", async ({
  page,
  request,
}) => {
  const song = "---\ntempo: 120\n---\n## Verse\n1 | 4\n## Chorus\n5 | 1 | 4 | 5\n";
  const id = await createVersion(request, { title: "Start Anywhere", content: song });
  await page.goto(`/versions/${id}/stand?s=2`);
  const bars = page.getByRole("main").locator(".cd-chart__bar");
  // Bar 2 of the Chorus.
  await bars.nth(1).click();
  await expect(page.getByText("Starts at bar 2")).toBeVisible();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(bars.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(bars.nth(0)).not.toHaveAttribute("aria-current", "step");
  await expect(bars.nth(2)).toHaveAttribute("aria-current", "step", { timeout: 4000 });
});

test("R-11.6 playback stops on a fermata bar until the musician taps", async ({
  page,
  request,
}) => {
  const song = "---\ntempo: 240\n---\n## Verse\n1 | 4~ | 5\n";
  const id = await createVersion(request, { title: "Hold It", content: song });
  await page.goto(`/versions/${id}/stand`);
  const bars = page.getByRole("main").locator(".cd-chart__bar");
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByText("Fermata · tap to go on")).toBeVisible({ timeout: 4000 });
  await expect(bars.nth(1)).toHaveAttribute("aria-current", "step");
  // It holds: two seconds is eight beats at 240 bpm.
  await page.waitForTimeout(2000);
  await expect(bars.nth(1)).toHaveAttribute("aria-current", "step");
  await bars.nth(1).click();
  await expect(bars.nth(2)).toHaveAttribute("aria-current", "step");
});

test("R-11.7 with the click off no audio plays and the pulse still runs; on, it clicks", async ({
  page,
  request,
}) => {
  // Count the tones the page asks the audio clock for.
  await page.addInitScript(() => {
    const create = AudioContext.prototype.createOscillator;
    Object.assign(window, { tones: 0 });
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      (window as unknown as { tones: number }).tones++;
      return create.call(this);
    };
  });
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}/stand`);
  const tones = () => page.evaluate(() => (window as unknown as { tones: number }).tones);

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("main").locator('[aria-current="step"]')).toHaveCount(1);
  await page.waitForTimeout(1000);
  expect(await tones()).toBe(0);
  await page.getByRole("button", { name: "Stop" }).click();

  await page.getByRole("button", { name: "Metronome sound" }).click();
  await page.getByRole("dialog").getByRole("switch", { name: "Click" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play" }).click();
  await expect.poll(tones, { timeout: 3000 }).toBeGreaterThan(0);
});
