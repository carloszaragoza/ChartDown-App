import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import { chooseSection, PASSWORD, signIn, signOut, signUpAndConfirm, unique } from "./flows";

const CHART = "## Verse\n1 | 4\n\n## Chorus\n4 | 5 | 6m | 1\n";

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

async function addNote(page: Page, section: string, instrument: string | null, text: string) {
  await chooseSection(page, section);
  if (instrument) await page.getByLabel(instrument, { exact: true }).check();
  await page.getByLabel("Note", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");
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
  await expect(page.getByRole("main").getByRole("status")).toContainText("Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Stand");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Welcome to the band.");
  await switchTo(page, ana, "Ana Stand");
  await page.goto("/bands");
  await page.getByRole("link", { name: band }).click();
  const benRow = page.getByRole("listitem").filter({ hasText: "Ben Stand" });
  await benRow.getByText("Default instruments of Ben Stand").click();
  await benRow.getByLabel("Keys", { exact: true }).check();
  await benRow.getByRole("button", { name: "Save instruments" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "The instruments were saved.",
  );

  // A set with two songs; the first has a note for everyone, one for keys and one for bass.
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(set);
  await page.getByLabel("Type").selectOption({ label: "Concert" });
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  for (const version of [v1, v2]) {
    await page.goto(`/versions/${version}`);
    await page.getByLabel("Add to a set").selectOption({ label: `${band} · ${set}` });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("added at the end");
  }
  await page.goto(`/versions/${v1}/notes`);
  await page.getByRole("navigation", { name: "Bands" }).getByRole("link", { name: band }).click();
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

  // The MD opens stand mode from the set's song: every note, and View as.
  await page.goto(`${setAddress}/songs/1`);
  await page.getByRole("link", { name: "Start in stand mode" }).click();
  await expect(page.getByText(`Song 1 of 2`)).toBeVisible();
  const current = page.getByRole("main");
  await expect(current).toContainText(notes.all);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(current).toContainText(notes.keys);
  await expect(current).toContainText(notes.bass);

  const viewAs = async (label: string) => {
    await page.getByText("View as").click();
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByText("View as")).toContainText(label);
  };
  await viewAs("Bass");
  await expect(current.getByRole("heading", { name: "Chorus" })).toBeVisible();
  await expect(current).toContainText(notes.bass);
  await expect(current).not.toContainText(notes.keys);
  await viewAs("Keys");
  await expect(current).toContainText(notes.keys);
  await expect(current).not.toContainText(notes.bass);
  await viewAs("All notes");
  await expect(current).toContainText(notes.keys);
  await expect(current).toContainText(notes.bass);

  // At the end of the song, Next goes on to the next song of the set.
  await page.getByRole("link", { name: "Next song" }).click();
  await expect(page.getByText("Song 2 of 2")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: second })).toBeVisible();

  // Ben has no View as, and the bass note never reaches him, even asking for it.
  await switchTo(page, ben, "Ben Stand");
  const response = await page.goto(`${setAddress}/songs/1/stand?s=2&as=bass`);
  await expect(page.getByText("View as")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(notes.keys);
  expect(await response?.text()).not.toContain(notes.bass);
});
