import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import { signOut, signUpAndConfirm, unique, addToSet, expectStatus } from "./flows";

// The set's songs: "3 songs" on its edit page, "Songs" on the set screen.
const songs = (page: Page) => page.getByRole("region", { name: /songs?$/i }).getByRole("listitem");

test("R-05.1 a set's name is unique in the band; songs are added, ordered and duplicated", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const band = `Lake Band ${stamp}`;
  const sunday = `Sunday ${stamp}`;
  const ana = unique("setmd");
  const ben = unique("setplayer");
  const titles = ["Amber Fields", "Blue Harbor", "Cedar Lane"].map((title) => `${title} ${stamp}`);
  const versions = await Promise.all(
    titles.map((title) => createVersion(request, { title, content: "## Verse\n1 | 4\n" })),
  );

  // Ana's band, with Ben in it.
  await signUpAndConfirm(page, ana, "Ana Sets");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");

  // A set, and the same name again is refused (R-05.1).
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(sunday);
  await page.getByLabel("Date (optional)").fill("2030-06-02");
  await page.getByLabel("Time (optional)").fill("09:00");
  await page.getByLabel("Type").selectOption({ label: "Service" });
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("heading", { level: 1, name: sunday })).toBeVisible();
  // R-05.1 (T-708): a set at 9:00 shows 9:00 AM with its date.
  await expect(page.getByText("Sunday, June 2, 2030 · 9:00 AM")).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  await page.getByRole("main").getByRole("link", { name: band }).click();
  await expect(page.getByRole("region", { name: "Upcoming" })).toContainText(sunday);
  await page.getByLabel("Set name").fill(`  ${sunday.toLowerCase()} `);
  await page.getByLabel("Type").selectOption({ label: "Rehearsal" });
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Your band already has a set with that name.",
  );

  // Songs are added from their versions, at the end (R-05.2).
  for (const version of versions) {
    await page.goto(`/versions/${version}`);
    await addToSet(page, `${band} · ${sunday}`);
    await expectStatus(page, "added at the end");
  }
  await expect(songs(page)).toHaveText(
    titles.map((title, index) => new RegExp(`^${index + 1}${title}`)),
  );

  // Cedar Lane moves up to second.
  await page.getByRole("button", { name: `Move ${titles[2]} up` }).click();
  await expectStatus(page, "The order was saved.");
  await expect(songs(page)).toHaveText([
    new RegExp(`^1${titles[0]}`),
    new RegExp(`^2${titles[2]}`),
    new RegExp(`^3${titles[1]}`),
  ]);

  // Duplicating keeps the songs, without the date (R-05.6).
  await expect(page.getByLabel("Name of the copy")).toHaveValue(`${sunday} (copy)`);
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expectStatus(page, "This is the copy.");
  await expect(page.getByRole("heading", { level: 1, name: `${sunday} (copy)` })).toBeVisible();
  await expect(page.getByText("No date")).toBeVisible();
  await expect(songs(page)).toHaveCount(3);
  await page.goto("/");
  await signOut(page);

  // Ben joins and reads the set, without the music director's controls.
  await signUpAndConfirm(page, ben, "Ben Sets");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await page.goto(setAddress);
  await expect(songs(page)).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Duplicate", exact: true })).toHaveCount(0);
});
