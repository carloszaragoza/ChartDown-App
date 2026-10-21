import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  addToSet,
  chooseInstrument,
  createSet,
  expectSignedIn,
  expectStatus,
  PASSWORD,
  setKey,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
} from "./flows";

const CHART = "---\nkey: G\n---\n## Verse\n1 | 4 | 5 | 1\n";

/**
 * Ana's band with Luis, and a set with a song; Ana is left signed in on the set's page.
 * `asLuis` runs while Luis is signed in, before Ana makes the set.
 */
async function bandWithSet(
  page: Page,
  request: APIRequestContext,
  asLuis: (page: Page) => Promise<void> = async () => {},
) {
  const stamp = Date.now();
  const band = `Cedar Band ${stamp}`;
  const set = `Thursday ${stamp}`;
  const title = `Slow River ${stamp}`;
  const ana = unique("noticemd");
  const luis = unique("noticebass");
  const id = await createVersion(request, { title, content: CHART });

  await signUpAndConfirm(page, ana, "Ana Notices");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(luis);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, luis, "Luis Bass");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await asLuis(page);
  await page.goto("/");
  await signOut(page);

  await signIn(page, ana, PASSWORD);
  await expectSignedIn(page, "Ana Notices");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Rehearsal" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  await page.goto(`/versions/${id}`);
  await addToSet(page, `${band} · ${set}`);
  return { set, title, luis };
}

test("R-09.1 R-09.3 adding Luis to the set reaches him instantly, saying what changed", async ({
  page,
  browser,
  request,
}) => {
  const { set, luis } = await bandWithSet(page, request);

  // Luis has his notices open on his own device.
  const luisDevice = await browser.newContext();
  const luisPage = await luisDevice.newPage();
  await signIn(luisPage, luis, PASSWORD);
  await expectSignedIn(luisPage, "Luis Bass");
  await luisPage.goto("/notices");
  await expect(luisPage.getByRole("heading", { level: 1, name: "Notices" })).toBeVisible();
  await expect(luisPage.getByText(`You were added to ${set}`)).toHaveCount(0);

  // Ana puts him on bass; the notice reaches him without reloading.
  await chooseInstrument(page, "Luis Bass", "Bass");
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expectStatus(page, "The lineup was saved.");
  // Each notice is a link: its dot ("New"), what changed, and when.
  const notice = luisPage.getByRole("list", { name: "Your notices" }).getByRole("link", {
    name: new RegExp(`You were added to ${set} \\(no date\\) on Bass\\.`),
  });
  await expect(notice).toBeVisible({ timeout: 15_000 });
  await expect(luisPage.getByRole("link", { name: /^Notices\s*1$/ })).toBeVisible();

  // Opening it goes to the set and marks it read.
  await notice.click();
  await expect(luisPage.getByRole("heading", { level: 1, name: set })).toBeVisible();
  await expect(luisPage.getByRole("link", { name: "Notices", exact: true })).toBeVisible();

  // Ana made the change, so she has no notice of it (R-09.3).
  await page.goto("/notices");
  await expect(page.getByText(`You were added to ${set}`)).toHaveCount(0);
  await luisDevice.close();
});

test("R-09.5 a notice Luis turned off is not delivered; the others still are", async ({
  page,
  request,
}) => {
  const { set, title, luis } = await bandWithSet(page, request, async (luisPage) => {
    await luisPage.goto("/profile?tab=notices");
    // Each switch saves at once (Design Handoff 2.0 screen 15).
    await luisPage.getByRole("switch", { name: "When I am added to a set" }).click();
    await expectStatus(luisPage, "Your notice choices were saved.");
    await expect(
      luisPage.getByRole("switch", { name: "When I am added to a set" }),
    ).not.toBeChecked();
    await expect(
      luisPage.getByRole("switch", { name: "When a song in my sets changes key" }),
    ).toBeChecked();
  });

  // Ana puts Luis on bass and changes the song's key.
  await chooseInstrument(page, "Luis Bass", "Bass");
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expectStatus(page, "The lineup was saved.");
  await setKey(page, title, "A");
  await expectStatus(page, "The key was saved.");
  await page.goto("/");
  await signOut(page);

  await signIn(page, luis, PASSWORD);
  await expectSignedIn(page, "Luis Bass");
  await page.goto("/notices");
  const notices = page.getByRole("list", { name: "Your notices" });
  await expect(notices).toContainText(
    `${title} in ${set} is now in A (it was in its written key).`,
  );
  await expect(notices).not.toContainText(`You were added to ${set}`);
});
