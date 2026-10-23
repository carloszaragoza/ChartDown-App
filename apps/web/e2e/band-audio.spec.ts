import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  addToSet,
  createSet,
  expectSignedIn,
  expectStatus,
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
  moreAction,
} from "./flows";

const TONE = new URL("../../../fixtures/audio/practice-tone.mp3", import.meta.url).pathname;

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expectSignedIn(page, name);
}

test("R-06.7 the MD adds the band's audio; its musicians hear it, nobody else", async ({
  page,
  request,
}) => {
  test.slow();
  const stamp = Date.now();
  const band = `Reed Band ${stamp}`;
  const ana = unique("audiomd");
  const ben = unique("audiomusician");
  const version = await createVersion(request, {
    title: `Copper Bells ${stamp}`,
    content: "---\ntempo: 120\n---\n## Verse\n1 | 4\n## Chorus\n4 | 1\n",
  });

  // Ana's band, and Ben in it.
  await signUpAndConfirm(page, ana, "Ana Audio");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Audio");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  // A musician adds one for their own personal space only, never for the band.
  await page.goto(`/versions/${version}`);
  await moreAction(page, "Add the band's audio");
  await expect(page.getByRole("dialog")).toContainText("For Just me");
  await expect(page.getByRole("dialog")).not.toContainText(band);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  await switchTo(page, ana, "Ana Audio");
  await page.goto(`/versions/${version}`);
  await moreAction(page, "Add the band's audio");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Band" }).click();
  await page.getByRole("option", { name: band }).click();

  // A file over 15 MB is refused before anything is uploaded.
  let uploads = 0;
  page.on("request", (sent) => {
    if (sent.url().includes("/storage/v1/object/band-audio")) uploads += 1;
  });
  await dialog.locator("input[type=file]").setInputFiles({
    name: "long-take.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.alloc(16 * 1024 * 1024),
  });
  await dialog.getByText("The band has the right to use this recording.").click();
  await expect(dialog.getByRole("button", { name: "Upload" })).toBeDisabled();
  expect(uploads).toBe(0);

  await dialog.locator("input[type=file]").setInputFiles(TONE);
  await dialog.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(`${band}'s recording · 0:08`)).toBeVisible();

  // Ben hears it; a visitor doesn't even see it.
  await switchTo(page, ben, "Ben Audio");
  await page.goto(`/versions/${version}`);
  await expect(page.getByText(`${band}'s recording · 0:08`)).toBeVisible();
  // T-2603: he plays it; the sections lie over its waveform and the chart follows it.
  await page.getByRole("button", { name: `Play ${band}'s recording` }).click();
  const player = page.getByRole("complementary", { name: "Band audio" });
  const play = player.getByRole("button", { name: "Play", exact: true });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(player.getByRole("button", { name: "Pause" })).toBeVisible();
  const sections = player.getByRole("group", { name: "Sections" });
  // Named as in the song form (T-2505), under each section's full name (T-2828).
  await expect(sections.locator(".cd-player-cells__short")).toHaveText(["V", "C"]);
  await expect(sections.locator(".cd-player-cells__name")).toHaveText(["Verse", "Chorus"]);
  // R-06.7 T-2828 the recording's volume, where the browser lets a page set it.
  await expect(player.getByRole("slider", { name: "Recording volume" })).toBeVisible();
  await sections.getByRole("button", { name: "Go to Chorus" }).click();
  await expect(sections.getByRole("button", { name: "Go to Chorus" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.locator('#section-2 [aria-current="step"]')).toHaveCount(1);
  // A musician moves where the music starts for himself but can't save it for the band.
  await player.getByRole("button", { name: /^Start and end/ }).click();
  await player
    .getByRole("group", { name: "Start", exact: true })
    .getByRole("button", { name: "+0.2 s" })
    .click();
  await expect(player.getByRole("button", { name: "Save for the band" })).toHaveCount(0);
  await player.getByRole("button", { name: "Close the player" }).click();
  await page.goto("/");
  await signOut(page);
  await page.goto(`/versions/${version}`);
  await expect(page.getByText(`${band}'s recording`)).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Play ${band}'s recording` })).toHaveCount(0);
});

test("R-06.7 a downloaded set keeps its songs' recordings: stand mode plays them offline", async ({
  page,
  context,
  request,
}) => {
  // Two accounts, a band, a set, an upload and a download: more than the usual time.
  test.slow();
  const stamp = Date.now();
  const band = `Tide Band ${stamp}`;
  const set = `Evensong ${stamp}`;
  const ana = unique("offaudiomd");
  const ben = unique("offaudio");
  const version = await createVersion(request, {
    title: `Salt Lanterns ${stamp}`,
    content: "---\ntempo: 120\n---\n## Verse\n1 | 4\n## Chorus\n4 | 1\n",
  });

  await signUpAndConfirm(page, ana, "Ana Tide");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Rehearsal" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setId = new URL(page.url()).pathname.split("/")[2] ?? "";
  await page.goto(`/versions/${version}`);
  await moreAction(page, "Add the band's audio");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Band" }).click();
  await page.getByRole("option", { name: band }).click();
  await dialog.locator("input[type=file]").setInputFiles(TONE);
  await dialog.getByText("The band has the right to use this recording.").click();
  await dialog.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(`${band}'s recording · 0:08`)).toBeVisible();
  // Adding the song opens the set's page.
  await addToSet(page, `${band} · ${set}`);

  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Tide");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");

  // Ben downloads the set; the recording is kept with it.
  await page.goto(`/sets/${setId}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.getByRole("button", { name: "Download for offline" }).click();
  await expect(page.getByText("Downloaded for offline")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await (await caches.open("chartdown-sets-v1")).keys();
        return keys.some((key) => new URL(key.url).pathname.startsWith("/offline/audio/"));
      }),
    )
    .toBe(true);

  // Airplane mode: stand mode plays the band's recording.
  await context.setOffline(true);
  await page.goto(`/offline/set/${setId}/1/stand`);
  await page.getByRole("button", { name: `Play ${band}'s recording` }).click();
  const player = page.getByRole("complementary", { name: "Band audio" });
  const play = player.getByRole("button", { name: "Play", exact: true });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(player.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(player).not.toContainText("can't be loaded");
  await context.setOffline(false);
});

test("R-06.7 T-2834 the chart editor plays the band's audio, and its preview follows it", async ({
  page,
}) => {
  test.slow();
  const title = `Salt Road ${Date.now()}`;
  await signUpAndConfirm(page, unique("audioeditor"), "Eda Editor");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page
    .getByLabel("Chart (ChartDown)")
    .fill("---\ntempo: 120\n---\n## Verse\n1 | 4\n## Chorus\n4 | 1\n");
  await page.getByLabel("Studio recording").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);

  // Her own recording, in her personal space.
  await moreAction(page, "Add the band's audio");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("For Just me");
  await dialog.locator("input[type=file]").setInputFiles(TONE);
  await dialog.getByText("The band has the right to use this recording.").click();
  await dialog.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Just me's recording · 0:08")).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Play Just me's recording" }).click();
  const player = page.getByRole("complementary", { name: "Band audio" });
  await expect(
    player.getByRole("group", { name: "Sections" }).locator(".cd-player-cells__short"),
  ).toHaveText(["V", "C"]);
  await player
    .getByRole("group", { name: "Sections" })
    .getByRole("button", { name: "Go to Chorus" })
    .click();
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview.locator('#section-2 [aria-current="step"]')).toHaveCount(1);
});
