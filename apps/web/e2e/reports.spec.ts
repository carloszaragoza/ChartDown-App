import { expect, test } from "@playwright/test";
import { makeAdmin } from "./admin";
import {
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
  expectStatus,
  expectSignedIn,
} from "./flows";

// Original example songs only; no lyrics (CLAUDE.md).
test("R-07.2 a reported version the Admin hides leaves the catalog and its owner gets a notice", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Copper Sky ${stamp}`;
  const dana = unique("owner");
  const adminName = `Admin ${stamp}`;

  // Dana publishes a version.
  await signUpAndConfirm(page, dana, "Dana Owner");
  await page.goto("/versions/new");
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;
  await expect(page.getByRole("button", { name: "Report" })).toHaveCount(0);
  await expect(page.getByText("Report", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "More actions" })).toHaveCount(0);
  await signOut(page);

  // Ben reports it.
  await signUpAndConfirm(page, unique("reporter"), "Ben Reporter");
  await page.goto(address);
  // Report is a secondary action, in the version's More actions menu.
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Report" }).click();
  await page.getByLabel("It has full song lyrics").check();
  await page.getByLabel("Note (optional)").fill("The whole verse is written out.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expectStatus(page, "the administrators will look at it");
  await signOut(page);

  // The Admin hides it.
  await signUpAndConfirm(page, unique("admin"), adminName);
  await makeAdmin(request, adminName);
  await page.goto("/admin/reports");
  const reported = page.getByRole("listitem", { name: title });
  await expect(reported).toContainText("Reported by 1 person");
  await expect(reported).toContainText("Full song lyrics: The whole verse is written out.");
  await reported.getByRole("button", { name: `Hide ${title}` }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `${title} is hidden; its owner was told why.`,
  );
  await expect(page.getByRole("button", { name: `Show ${title} again` })).toBeVisible();
  await expect(page.getByRole("listitem", { name: title })).toHaveCount(0);

  await page.goto(`/catalog?q=${encodeURIComponent(title)}`);
  await expect(page.getByText("No songs match.")).toBeVisible();
  await signOut(page);

  // Dana is told which version and why, and still sees it, marked hidden.
  await signIn(page, dana, PASSWORD);
  await expectSignedIn(page, "Dana Owner");
  await expect(page.getByRole("link", { name: /^Notices\s*1$/ })).toBeVisible();
  await page.goto("/notices");
  await page
    .getByRole("link", {
      name: new RegExp(
        `The administrators hid ${title} from the community because it has full song lyrics\\.`,
      ),
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`${address}$`));
  await expect(page.getByText("Hidden by the administrators")).toBeVisible();
});
