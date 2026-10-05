import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, signIn, signOut, signUpAndConfirm, unique } from "./flows";

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

test("R-05.2 a new revision from the author doesn't change the set until accepted", async ({
  page,
}) => {
  const stamp = Date.now();
  const band = `Reed Band ${stamp}`;
  const set = `Vespers ${stamp}`;
  const title = `North Light ${stamp}`;
  const ana = unique("pinmd");
  const ben = unique("pinplayer");

  // Ana's band, with Ben.
  await signUpAndConfirm(page, ana, "Ana Pin");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Pin");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Welcome to the band.");

  // Ana publishes a version and puts it in a set.
  await switchTo(page, ana, "Ana Pin");
  await page.getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 4\n");
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const version = new URL(page.url()).pathname;
  await page.goto("/bands");
  await page.getByRole("link", { name: band }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(set);
  await page.getByLabel("Type").selectOption({ label: "Service" });
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  await page.goto(version);
  await page.getByLabel("Add to a set").selectOption({ label: `${band} · ${set}` });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("revision 1")).toBeVisible();

  // As the author, she saves revision 2: the set stays on revision 1.
  await page.goto(`${version}/edit`);
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 5\n");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Saved as revision 2.");
  await page.goto(setAddress);
  await expect(
    page.getByText("The author has a newer revision: 2 (this set plays 1)."),
  ).toBeVisible();

  // Ben sees the notice, without the music director's buttons, and still plays revision 1.
  await switchTo(page, ben, "Ben Pin");
  await page.goto(setAddress);
  await expect(
    page.getByText("The author has a newer revision: 2 (this set plays 1)."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Update ${title} to the new revision` }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByText("revision 1", { exact: false })).toBeVisible();

  // Ana previews revision 2, then updates.
  await switchTo(page, ana, "Ana Pin");
  await page.goto(setAddress);
  await page.getByRole("link", { name: `See the new revision of ${title}` }).click();
  await expect(
    page.getByText("Preview of revision 2. This set still plays revision 1"),
  ).toBeVisible();
  await page.goto(`${setAddress}/edit`);
  await expect(page.getByText("revision 1")).toBeVisible();
  await page.goto(setAddress);
  await page.getByRole("button", { name: `Update ${title} to the new revision` }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("newest revision");
  await expect(page.getByText("The author has a newer revision")).toHaveCount(0);
  await page.goto(`${setAddress}/edit`);
  await expect(page.getByText("revision 2")).toBeVisible();
});
