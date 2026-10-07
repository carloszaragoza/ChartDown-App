import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  chooseSection,
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
  expectStatus,
  addToSet,
  setInstruments,
  createSet,
} from "./flows";

const CHART = "## Verse\n1 | 4\n\n## Chorus\n4 | 5 | 6m | 1\n";

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

async function addNote(page: Page, instrument: string, text: string) {
  await chooseSection(page, "Chorus");
  await page.getByLabel(instrument, { exact: true }).check();
  await page.getByLabel("Note", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Add note" }).click();
  // Wait for this note (in the list and on the chart): the status is still there from the previous one.
  await expect(page.getByRole("main").getByText(text, { exact: true }).first()).toBeVisible();
  await expectStatus(page, "The note was saved.");
}

test("R-06.4 the keyboardist's device never receives the bass notes", async ({ page, request }) => {
  const stamp = Date.now();
  const band = `Elm Band ${stamp}`;
  const set = `Matins ${stamp}`;
  const title = `Still Water ${stamp}`;
  const keysNote = `Pad swell for keys ${stamp}.`;
  const bassNote = `Walk up for bass ${stamp}.`;
  const ana = unique("viewmd");
  const ben = unique("viewkeys");
  const version = await createVersion(request, { title, content: CHART });

  // Ana's band; Ben joins and plays keys there.
  await signUpAndConfirm(page, ana, "Ana View");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Keys");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");

  await switchTo(page, ana, "Ana View");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await setInstruments(page, "Ben Keys", ["Keys"]);
  await expectStatus(page, "The instruments were saved.");

  // A set with the song, and the band's notes for keys and for bass.
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Rehearsal" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  await page.goto(`/versions/${version}`);
  await addToSet(page, `${band} · ${set}`);
  await expectStatus(page, "added at the end");
  await page.goto(`/versions/${version}/notes`);
  await page.getByRole("radiogroup", { name: "Bands" }).getByRole("radio", { name: band }).click();
  await expect(page.getByText(`Notes of ${band}`)).toBeVisible();
  await addNote(page, "Keys", keysNote);
  await addNote(page, "Bass", bassNote);

  // T-706: the set screen offers the music director Edit set.
  await page.goto(setAddress);
  await expect(page.getByRole("link", { name: "Edit set" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start in stand mode" })).toBeVisible();

  // The music director sees both.
  await page.goto(`${setAddress}/songs/1`);
  await expect(page.getByText("You see every note, as the music director.")).toBeVisible();
  await expect(page.locator("#section-2")).toContainText(keysNote);
  await expect(page.locator("#section-2")).toContainText(bassNote);

  // Ben gets the keys note, and the bass note is nowhere in what his browser received.
  await switchTo(page, ben, "Ben Keys");
  // T-706: on the set screen, the song with its key and his notes, and the lineup, without Edit set.
  await page.goto(setAddress);
  const songRow = page.getByRole("region", { name: "Songs" }).getByRole("listitem");
  await expect(songRow).toContainText(title);
  await expect(songRow).toContainText("Key C");
  await expect(songRow).toContainText("1 for you");
  const lineup = page.getByRole("region", { name: "Lineup" });
  await expect(lineup).toContainText("Ben Keys (you)");
  await expect(lineup).toContainText("Keys");
  await expect(page.getByRole("link", { name: "Edit set" })).toHaveCount(0);
  const response = await page.goto(`${setAddress}/songs/1`);
  await expect(page.getByText("1 note for you")).toBeVisible();
  await expect(page.locator("#section-2")).toContainText(keysNote);
  expect(await response?.text()).not.toContain(bassNote);
  expect(await page.content()).not.toContain(bassNote);

  // Outside a set, the version shows no band notes at all (R-06.5).
  await page.goto(`/versions/${version}`);
  await expect(page.getByText(keysNote)).toHaveCount(0);

  // Someone outside the band gets nothing.
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, unique("outsider"), "Dan Outside");
  expect((await page.goto(`${setAddress}/songs/1`))?.status()).toBe(404);
});
