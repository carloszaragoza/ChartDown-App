import { expect, test } from "@playwright/test";
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
  createSet,
  setKey,
} from "./flows";

test("R-08.3 a change made while offline appears as a notice", async ({
  page,
  context,
  browser,
  request,
}) => {
  const stamp = Date.now();
  const band = `Yew Band ${stamp}`;
  const set = `Compline ${stamp}`;
  const title = `Low Bridge ${stamp}`;
  const newNote = `Swell into the last chorus ${stamp}.`;
  const ana = unique("syncmd");
  const ben = unique("synckeys");
  const version = await createVersion(request, {
    title,
    content: "## Verse\n1 | 4\n\n## Chorus\n4 | 5\n",
  });

  // Ana's band with Ben on keys, and a set with the song.
  await signUpAndConfirm(page, ana, "Ana Sync");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Service" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setId = new URL(page.url()).pathname.split("/")[2] ?? "";
  await page.goto(`/versions/${version}`);
  await addToSet(page, `${band} · ${set}`);
  await expectStatus(page, "added at the end");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Sync");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");

  // Ben downloads the set, then goes offline.
  await page.goto(`/sets/${setId}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("button", { name: "Download for offline" }).click();
  await expect(page.getByText("Downloaded for offline")).toBeVisible();
  await context.setOffline(true);

  // Meanwhile, Ana changes the song's key and writes a note for everyone.
  const other = await browser.newContext();
  const anaPage = await other.newPage();
  await signIn(anaPage, ana, PASSWORD);
  await expect(anaPage.getByText("Signed in as Ana Sync")).toBeVisible();
  await anaPage.goto(`/sets/${setId}/edit`);
  await setKey(anaPage, title, "A");
  await expectStatus(anaPage, "The key was saved.");
  await anaPage.goto(`/versions/${version}/notes`);
  await anaPage
    .getByRole("radiogroup", { name: "Bands" })
    .getByRole("radio", { name: band })
    .click();
  await expect(anaPage.getByText(`Notes of ${band}`)).toBeVisible();
  await chooseSection(anaPage, "Chorus");
  await anaPage.getByLabel("Note", { exact: true }).fill(newNote);
  await anaPage.getByRole("button", { name: "Add note" }).click();
  await expectStatus(anaPage, "The note was saved.");
  await other.close();

  // Ben's connection comes back: the set is brought up to date and says what changed.
  await context.setOffline(false);
  await page.goto(`/sets/${setId}`);
  const notice = page.getByRole("region", { name: "This set changed while you were offline" });
  await expect(notice).toContainText(`${title} is now in A (it was in its written key).`);
  await expect(notice).toContainText(`New note in ${title}, Chorus: “${newNote}”`);
  const kept = await page.evaluate(
    async (id) =>
      (await (await caches.open("chartdown-sets-v1")).match(`/offline/bundles/${id}`))?.text(),
    setId,
  );
  expect(kept).toContain(newNote);

  await notice.getByRole("button", { name: "Got it" }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "This set changed while you were offline" }),
  ).toHaveCount(0);
});
