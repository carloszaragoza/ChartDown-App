import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  chooseSection,
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
  addToSet,
  expectStatus,
  setInstruments,
  createSet,
  expectSignedIn,
} from "./flows";

const CHART = "## Verse\n1 | 4\n\n## Chorus\n4 | 5 | 6m | 1\n";

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expectSignedIn(page, name);
}

test("R-08.2 R-08.4 in airplane mode every song opens with its notes, read-only", async ({
  page,
  context,
  request,
}) => {
  const stamp = Date.now();
  const band = `Fir Band ${stamp}`;
  const set = `Lauds ${stamp}`;
  const first = `Morning Rain ${stamp}`;
  const second = `Quiet Pier ${stamp}`;
  const keysNote = `Keys hold ${stamp}.`;
  const bassNote = `Bass rest ${stamp}.`;
  const ana = unique("offmd");
  const ben = unique("offkeys");
  const versions = [
    await createVersion(request, { title: first, content: CHART }),
    await createVersion(request, { title: second, content: CHART }),
  ];

  // Ana's band; Ben joins and plays keys.
  await signUpAndConfirm(page, ana, "Ana Offline");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Offline");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await switchTo(page, ana, "Ana Offline");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await setInstruments(page, "Ben Offline", ["Keys"]);
  await expectStatus(page, "The instruments were saved.");

  // A set with both songs; the first has notes for keys and for bass.
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Rehearsal" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setId = new URL(page.url()).pathname.split("/")[2] ?? "";
  for (const version of versions) {
    await page.goto(`/versions/${version}`);
    await addToSet(page, `${band} · ${set}`);
    await expectStatus(page, "added at the end");
  }
  await page.goto(`/versions/${versions[0]}/notes`);
  await page.getByRole("radiogroup", { name: "Bands" }).getByRole("radio", { name: band }).click();
  await expect(page.getByText(`Notes of ${band}`)).toBeVisible();
  for (const [instrument, text] of [
    ["Keys", keysNote],
    ["Bass", bassNote],
  ] as const) {
    await chooseSection(page, "Chorus");
    await page.getByLabel(instrument, { exact: true }).check();
    await page.getByLabel("Note", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Add note" }).click();
    await expectStatus(page, "The note was saved.");
  }

  // Ben downloads the set, with the service worker in charge of the page.
  await switchTo(page, ben, "Ben Offline");
  await page.goto(`/sets/${setId}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.getByRole("button", { name: "Download for offline" }).click();
  await expect(page.getByText("Downloaded for offline")).toBeVisible();
  const stored = await page.evaluate(
    async (id) =>
      (await (await caches.open("chartdown-sets-v1")).match(`/offline/bundles/${id}`))?.text(),
    setId,
  );
  expect(stored).toContain(keysNote);
  expect(stored).not.toContain(bassNote);

  // Airplane mode: the set, each song with its notes, and stand mode, read-only (R-08.4).
  await context.setOffline(true);
  await page.goto(`/offline/set/${setId}`);
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  await expect(page.getByText("Offline copy on this device, read-only.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit set" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Songs" }).getByRole("listitem")).toHaveCount(2);

  await page.getByRole("link", { name: first }).click();
  await expect(page.getByRole("heading", { level: 1, name: first })).toBeVisible();
  await expect(page.getByText("1 note for you")).toBeVisible();
  await expect(page.locator("#section-2")).toContainText(keysNote);
  await expect(page.getByRole("link", { name: "Next song" })).toBeVisible();
  await page.getByRole("link", { name: "Next song" }).click();
  await expect(page.getByRole("heading", { level: 1, name: second })).toBeVisible();

  await page.goto(`/offline/set/${setId}/1/stand?s=2`);
  await expect(page.getByText("Song 1 of 2")).toBeVisible();
  await expect(page.getByRole("main")).toContainText(keysNote);
  await page.getByRole("link", { name: "Next song" }).click();
  await expect(page.getByText("Song 2 of 2")).toBeVisible();
  await context.setOffline(false);

  // Signing out forgets the downloaded sets on this device.
  await page.goto("/");
  await signOut(page);
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).includes("chartdown-sets-v1")))
    .toBe(false);
});
