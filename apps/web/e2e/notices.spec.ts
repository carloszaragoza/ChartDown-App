import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import { PASSWORD, signIn, signOut, signUpAndConfirm, unique } from "./flows";

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
  await expect(page.getByRole("main").getByRole("status")).toContainText("Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, luis, "Luis Bass");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Welcome to the band.");
  await asLuis(page);
  await page.goto("/");
  await signOut(page);

  await signIn(page, ana, PASSWORD);
  await expect(page.getByText("Signed in as Ana Notices")).toBeVisible();
  await page.goto("/bands");
  await page.getByRole("link", { name: band }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(set);
  await page.getByLabel("Type").selectOption({ label: "Rehearsal" });
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  await page.goto(`/versions/${id}`);
  await page.getByLabel("Add to a set").selectOption({ label: `${band} · ${set}` });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("added at the end");
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
  await expect(luisPage.getByText("Signed in as Luis Bass")).toBeVisible();
  await luisPage.goto("/notices");
  await expect(luisPage.getByRole("heading", { level: 1, name: "Notices" })).toBeVisible();
  await expect(luisPage.getByText(`You were added to ${set}`)).toHaveCount(0);

  // Ana puts him on bass; the notice reaches him without reloading.
  await page.getByRole("group", { name: "Luis Bass" }).getByLabel("Bass", { exact: true }).check();
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The lineup was saved.");
  const notice = luisPage.getByRole("list", { name: "Your notices" }).getByRole("button", {
    name: new RegExp(`^New\\s*You were added to ${set} \\(no date\\) on Bass\\.$`),
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
    await luisPage.goto("/profile");
    await luisPage.getByLabel("When I am added to a set").uncheck();
    await luisPage.getByRole("button", { name: "Save notices" }).click();
    await expect(luisPage.getByRole("main").getByRole("status")).toContainText(
      "Your notice choices were saved.",
    );
    await expect(luisPage.getByLabel("When I am added to a set")).not.toBeChecked();
    await expect(luisPage.getByLabel("When a song in my sets changes key")).toBeChecked();
  });

  // Ana puts Luis on bass and changes the song's key.
  await page.getByRole("group", { name: "Luis Bass" }).getByLabel("Bass", { exact: true }).check();
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The lineup was saved.");
  await page.getByLabel(`Key of ${title}`).selectOption("A");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The key was saved.");
  await page.goto("/");
  await signOut(page);

  await signIn(page, luis, PASSWORD);
  await expect(page.getByText("Signed in as Luis Bass")).toBeVisible();
  await page.goto("/notices");
  const notices = page.getByRole("list", { name: "Your notices" });
  await expect(notices).toContainText(
    `${title} in ${set} is now in A (it was in its written key).`,
  );
  await expect(notices).not.toContainText(`You were added to ${set}`);
});
