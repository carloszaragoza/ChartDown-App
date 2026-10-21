import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { expectStandNow, standNow } from "./flows";

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
  // The Chorus becomes the current section and glides to the top of the stack (R-03.12).
  await expect(standNow(page).getByRole("heading", { level: 2, name: "Chorus" })).toBeVisible({
    timeout: 5000,
  });
  await expectStandNow(page, "Chorus");
  await expect(page).toHaveURL(/\?s=2$/);
});

test("R-03.12 playing, the current section says which bar sounds, after a count-in that says so", async ({
  page,
  request,
}) => {
  const slow = "---\ntempo: 120\n---\n## Verse\n1 | 4 | 5 | 1\n## Chorus\n5 | 1\n";
  const id = await createVersion(request, { title: "Count Me In", content: slow });
  await page.goto(`/versions/${id}/stand`);
  await page.getByRole("button", { name: "Metronome options" }).click();
  await page.getByRole("dialog").getByRole("switch", { name: "Count-in" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play" }).click();
  // Half a second a beat: the count-in bar lasts two seconds, then the Verse counts its bars.
  await expect(standNow(page)).toContainText("Count-in");
  await expect(standNow(page)).toContainText("Bar 1 of 4", { timeout: 4000 });
  await expect(standNow(page)).toContainText("Bar 2 of 4", { timeout: 4000 });
  await expect(page.getByText("Following the metronome.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(standNow(page)).not.toContainText("Bar ");
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
  await expect(page.getByText("Next up: Chorus", { exact: false })).toBeVisible({ timeout: 5000 });
  await expect(standNow(page).getByRole("heading", { level: 2, name: "Verse" })).toBeVisible();
  await expect(current.getByRole("group").first()).toHaveAttribute("aria-current", "step");

  // Queued, the Chorus is cancelled by choosing it again.
  await form.getByRole("link", { name: /^Chorus,/ }).click();
  await expect(form.getByRole("link", { name: /plays next/ })).toHaveCount(1);
  await form.getByRole("link", { name: /^Chorus,/ }).click();
  await expect(form.getByRole("link", { name: /plays next/ })).toHaveCount(0);
});

test("R-11.15 a queued section's card comes right after the one playing", async ({
  page,
  request,
}) => {
  const song =
    "---\ntempo: 60\n---\n## Verse\n1 | 4 | 5 | 1\n## Chorus\n4 | 5\n## Tag\n1 | 1\n## Bridge\n6m | 5\n";
  const id = await createVersion(request, { title: "Jump Ahead", content: song });
  await page.goto(`/versions/${id}/stand`);
  const coming = page.locator('.cd-stand-card[data-state="upcoming"]').first();
  await expect(coming.getByRole("heading", { level: 2 })).toHaveText("Chorus");
  await page.getByRole("button", { name: "Play" }).click();
  // From the Verse, the band is told to go to the Bridge: its card comes next, then the Chorus is
  // back in its place once the queue is cancelled.
  const form = page.getByRole("navigation", { name: "Song form" });
  await form.getByRole("link", { name: /^Bridge,/ }).click();
  await expect(coming.getByRole("heading", { level: 2 })).toHaveText("Bridge");
  await expect(page.getByText("Next up: Bridge", { exact: false })).toBeVisible();
  await form.getByRole("link", { name: /^Bridge,/ }).click();
  await expect(coming.getByRole("heading", { level: 2 })).toHaveText("Chorus");
});

test("R-11.2 tapping a bar and pressing Play starts there, then the next bar follows", async ({
  page,
  request,
}) => {
  const song = "---\ntempo: 120\n---\n## Verse\n1 | 4\n## Chorus\n5 | 1 | 4 | 5\n";
  const id = await createVersion(request, { title: "Start Anywhere", content: song });
  await page.goto(`/versions/${id}/stand?s=2`);
  const bars = standNow(page).locator(".cd-chart__bar");
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

  await page.getByRole("button", { name: "Metronome options" }).click();
  await page.getByRole("dialog").getByRole("switch", { name: "Click" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play" }).click();
  await expect.poll(tones, { timeout: 3000 }).toBeGreaterThan(0);
});

test("R-11.9 the practice speed changes the tempo played, never the chart", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}/stand`);
  await page.getByRole("button", { name: "Metronome options" }).click();
  const speed = page.getByRole("dialog").getByRole("slider", { name: "Practice speed" });
  await speed.focus();
  for (let step = 0; step < 4; step++) await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog").getByText("80% · 192 bpm")).toBeVisible();
  await page.keyboard.press("Escape");
  // The chart still says 240.
  await expect(page.getByText(/Tempo 240/)).toBeVisible();
});

test("R-11.9 T-2808 the tempo stepper plays at 74 while the chart still says 71", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, {
    title: `Steady Song ${Date.now()}`,
    content: "---\ntempo: 71\n---\n## Verse\n1 | 4 | 5 | 1\n",
  });
  await page.goto(`/versions/${id}/stand`);
  await page.getByRole("button", { name: "Metronome options" }).click();
  const sheet = page.getByRole("dialog");
  const tempo = sheet.getByRole("spinbutton", { name: "Tempo" });
  await expect(tempo).toHaveValue("71");
  await expect(sheet.getByText("Same as the chart tempo.")).toBeVisible();
  for (let step = 0; step < 3; step++) await sheet.getByRole("button", { name: "Faster" }).click();
  await expect(tempo).toHaveValue("74");
  await expect(sheet.getByText("Chart tempo is 71.")).toBeVisible();
  await expect(sheet.getByText("104% · 74 bpm")).toBeVisible();
  await page.keyboard.press("Escape");
  // The metronome plays at 74; the chart still says 71.
  await expect(page.getByRole("group", { name: "Metronome" }).first()).toContainText("74");
  await expect(page.getByText(/Tempo 71/)).toBeVisible();
});

test("R-11.9 T-2808 a tempo with a decimal plays as written: 85.5, then 86.5", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, {
    title: `Half Beat ${Date.now()}`,
    content: "---\ntempo: 85.5\n---\n## Verse\n1 | 4 | 5 | 1\n",
  });
  await page.goto(`/versions/${id}/stand`);
  const metronome = page.getByRole("group", { name: "Metronome" }).first();
  await expect(metronome).toContainText("85.5");
  await page.getByRole("button", { name: "Metronome options" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("spinbutton", { name: "Tempo" })).toHaveValue("85.5");
  await expect(sheet.getByText("Same as the chart tempo.")).toBeVisible();
  await sheet.getByRole("button", { name: "Faster" }).click();
  await expect(sheet.getByRole("spinbutton", { name: "Tempo" })).toHaveValue("86.5");
  await expect(sheet.getByText("Chart tempo is 85.5.")).toBeVisible();
});

test("R-11.10 the space bar plays and stops; a pedal queues the next section while playing", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { screenLocks: 0 });
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: async () => {
          (window as unknown as { screenLocks: number }).screenLocks++;
          return { release: async () => {} };
        },
      },
    });
  });
  const id = await createVersion(request, { title: "Fast Song", content: FAST });
  await page.goto(`/versions/${id}/stand`);
  const now = page.getByRole("main").locator('[aria-current="step"]');
  await page.locator("body").click({ position: { x: 5, y: 400 } });
  await page.keyboard.press(" ");
  await expect(now).toHaveCount(1);
  // The screen stays on while it plays (R-11.11).
  expect(
    await page.evaluate(() => (window as unknown as { screenLocks: number }).screenLocks),
  ).toBe(1);
  // A pedal's page-down queues the Chorus; the screen stays on the Verse.
  await page.keyboard.press("PageDown");
  await expect(
    page.getByRole("navigation", { name: "Song form" }).getByRole("link", { name: /plays next/ }),
  ).toHaveCount(1);
  await expect(standNow(page).getByRole("heading", { level: 2, name: "Verse" })).toBeVisible();
  await page.keyboard.press(" ");
  await expect(now).toHaveCount(0);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("R-11.13 nothing flashes or slides: the line moves in steps and the counter still advances", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, { title: "Fast Song", content: FAST });
    await page.goto(`/versions/${id}/stand`);
    await page.getByRole("button", { name: "Play" }).click();
    const now = page.getByRole("main").locator('[aria-current="step"]');
    await expect(now).toHaveCount(1);
    const line = await now.evaluate((bar) => getComputedStyle(bar, "::after").transitionDuration);
    // None at all, or the design system's own near-zero for reduced motion.
    expect(Number.parseFloat(line)).toBeLessThan(0.01);
    const first = await page.getByText(/^[1-4] \/ 4$/).textContent();
    await expect(page.getByText(/^[1-4] \/ 4$/)).not.toHaveText(first ?? "");
  });
});
