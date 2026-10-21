import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  PASSWORD,
  addToSet,
  chooseSection,
  createSet,
  expectSignedIn,
  expectStatus,
  gapUnderSongMap,
  setInstruments,
  signIn,
  signOut,
  signUpAndConfirm,
  standNow,
  unique,
} from "./flows";

const CHART = "## Verse\n1 | 4\n\n## Chorus\n4 | 5 | 6m | 1\n";

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expectSignedIn(page, name);
}

async function addNote(page: Page, section: string, instrument: string | null, text: string) {
  await chooseSection(page, section);
  if (instrument) await page.getByLabel(instrument, { exact: true }).check();
  await page.getByLabel("Note", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Add note" }).click();
  // Wait for this note (in the list and on the chart): the status is still there from the previous one.
  await expect(page.getByRole("main").getByText(text, { exact: true }).first()).toBeVisible();
  await expectStatus(page, "The note was saved.");
}

test("R-06.3 the MD switches views and sees every note", async ({ page, request }) => {
  const stamp = Date.now();
  const band = `Ash Band ${stamp}`;
  const set = `Evensong ${stamp}`;
  const [first, second] = [`Long Road ${stamp}`, `Short Way ${stamp}`];
  const notes = {
    all: `Everyone soft ${stamp}.`,
    keys: `Keys pad ${stamp}.`,
    bass: `Bass walk ${stamp}.`,
  };
  const ana = unique("standmd");
  const ben = unique("standkeys");
  const v1 = await createVersion(request, { title: first, content: CHART });
  const v2 = await createVersion(request, { title: second, content: CHART });

  // Ana's band; Ben plays keys.
  await signUpAndConfirm(page, ana, "Ana Stand");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Stand");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await switchTo(page, ana, "Ana Stand");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await setInstruments(page, "Ben Stand", ["Keys"]);
  await expectStatus(page, "The instruments were saved.");

  // A set with two songs; the first has a note for everyone, one for keys and one for bass.
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Concert" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  for (const version of [v1, v2]) {
    await page.goto(`/versions/${version}`);
    await addToSet(page, `${band} · ${set}`);
    await expectStatus(page, "added at the end");
  }
  await page.goto(`/versions/${v1}/notes`);
  await page.getByRole("radiogroup", { name: "Bands" }).getByRole("radio", { name: band }).click();
  await expect(page.getByText(`Notes of ${band}`)).toBeVisible();
  await addNote(page, "Verse", null, notes.all);
  await addNote(page, "Chorus", "Keys", notes.keys);
  await addNote(page, "Chorus", "Bass", notes.bass);
  // Each new note starts from a clean form: the bass note is for bass only.
  const bassRow = page
    .getByRole("list", { name: "Notes of Chorus" })
    .getByRole("listitem")
    .filter({ hasText: notes.bass });
  await expect(bassRow).toContainText("Bass");
  await expect(bassRow).not.toContainText("Keys");

  // The pages stand mode asks the server for from here on, loaded ahead or not (F-006).
  const asked: string[] = [];
  const ever: string[] = [];
  page.on("request", (sent) => {
    if (sent.headers()["rsc"] !== "1") return;
    const address = new URL(sent.url());
    address.searchParams.delete("_rsc");
    asked.push(`${address.pathname}${address.search}`);
    ever.push(`${address.pathname}${address.search}`);
  });

  // The MD opens stand mode from the set's song: every note, and View as.
  await page.goto(`${setAddress}/songs/1`);
  await page.getByRole("link", { name: "Start in stand mode" }).click();
  await expect(page.getByText(`Song 1 of 2`)).toBeVisible();
  // F-001: in a set too, the section sits right under the song map.
  expect(await gapUnderSongMap(page)).toBeLessThan(40);
  // The current section, at the top of the stack (R-03.12).
  const current = standNow(page);
  await expect(current).toContainText(notes.all);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(current).toContainText(notes.keys);
  await expect(current).toContainText(notes.bass);

  const viewAs = async (label: string) => {
    // View as is a menu on the stand's top line on an iPad (T-2706).
    await page.getByRole("combobox", { name: "View as" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await expect(page.getByRole("combobox", { name: "View as" })).toContainText(label);
  };
  // F-006: every view came with the page, so switching asks the server nothing for this song
  // (the next song, loaded ahead, follows the view).
  const thisSong = `${setAddress}/songs/1/stand`;
  asked.length = 0;
  await viewAs("Bass");
  await expect(page).toHaveURL(/as=bass/);
  await expect(current.getByRole("heading", { name: "Chorus" })).toBeVisible();
  await expect(current).toContainText(notes.bass);
  await expect(current).not.toContainText(notes.keys);
  await viewAs("Keys");
  await expect(current).toContainText(notes.keys);
  await expect(current).not.toContainText(notes.bass);
  await viewAs("All notes");
  await expect(current).toContainText(notes.keys);
  await expect(current).toContainText(notes.bass);
  expect(asked.filter((address) => address.startsWith(thisSong))).toEqual([]);

  // At the end of the song, Next goes on to the next song of the set, loaded ahead whole, so
  // moving on asks the server nothing more (F-006).
  const nextSong = `${setAddress}/songs/2/stand`;
  await expect.poll(() => ever.includes(nextSong)).toBe(true);
  asked.length = 0;
  await page.getByRole("link", { name: "Next song" }).click();
  await expect(page.getByText("Song 2 of 2")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: second })).toBeVisible();
  expect(asked).not.toContain(nextSong);

  // Ben has no View as, and the bass note never reaches him, even asking for it.
  await switchTo(page, ben, "Ben Stand");
  const response = await page.goto(`${setAddress}/songs/1/stand?s=2&as=bass`);
  await expect(page.getByRole("combobox", { name: "View as" })).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(notes.keys);
  expect(await response?.text()).not.toContain(notes.bass);
});
