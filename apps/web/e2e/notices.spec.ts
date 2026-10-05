import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { PASSWORD, signIn, signOut, signUpAndConfirm, unique } from "./flows";

const CHART = "---\nkey: G\n---\n## Verse\n1 | 4 | 5 | 1\n";

test("R-09.1 R-09.3 adding Luis to the set reaches him instantly, saying what changed", async ({
  page,
  browser,
  request,
}) => {
  const stamp = Date.now();
  const band = `Cedar Band ${stamp}`;
  const set = `Thursday ${stamp}`;
  const title = `Slow River ${stamp}`;
  const ana = unique("noticemd");
  const luis = unique("noticebass");
  const id = await createVersion(request, { title, content: CHART });

  // Ana's band with Luis, and a set with a song.
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
  await expect(luisPage.getByRole("link", { name: "Notices, 1 unread" })).toBeVisible();

  // Opening it goes to the set and marks it read.
  await notice.click();
  await expect(luisPage.getByRole("heading", { level: 1, name: set })).toBeVisible();
  await expect(luisPage.getByRole("link", { name: "Notices, none unread" })).toBeVisible();

  // Ana made the change, so she has no notice of it (R-09.3).
  await page.goto("/notices");
  await expect(page.getByText(`You were added to ${set}`)).toHaveCount(0);
  await luisDevice.close();
});
