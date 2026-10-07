import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import { PASSWORD, signIn, signOut, signUpAndConfirm, unique, addToSet } from "./flows";

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

async function createSet(page: Page, band: string, name: string, date: string) {
  await page.goto("/bands");
  await page.getByRole("link", { name: band }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(name);
  await page.getByLabel("Date (optional)").fill(date);
  await page.getByLabel("Type").selectOption({ label: "Service" });
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function addSong(page: Page, version: string, label: string) {
  await page.goto(`/versions/${version}`);
  await addToSet(page, label);
  await expect(page.getByRole("main").getByRole("status")).toContainText("added at the end");
}

test("R-05.5 the temporary MD cannot edit other sets or the layer", async ({ page, request }) => {
  const stamp = Date.now();
  const band = `Oak Band ${stamp}`;
  const sunday = `Sunday ${stamp}`;
  const friday = `Friday ${stamp}`;
  const [first, second] = [`Morning Star ${stamp}`, `River Song ${stamp}`];
  const ana = unique("tmpmd");
  const ben = unique("tmpben");
  const v1 = await createVersion(request, { title: first, content: "## Verse\n1 | 4\n" });
  const v2 = await createVersion(request, { title: second, content: "## Verse\n1 | 4\n" });

  await signUpAndConfirm(page, ana, "Ana Lead");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Temp");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Welcome to the band.");

  // Ana's two sets; she appoints Ben for Sunday only.
  await switchTo(page, ana, "Ana Lead");
  const fridayAddress = await createSet(page, band, friday, "2030-06-07");
  const sundayAddress = await createSet(page, band, sunday, "2030-06-09");
  await addSong(page, v1, `${band} · ${sunday}`);
  await addSong(page, v2, `${band} · ${sunday}`);
  await addSong(page, v1, `${band} · ${friday}`);
  await page.goto(`${sundayAddress}/edit`);
  await expect(page.getByText("Nobody. The music director arranges this set.")).toBeVisible();
  await page.getByLabel("Musician").selectOption({ label: "Ben Temp" });
  await expect(page.getByLabel("Until")).toHaveValue("2030-06-09");
  await page.getByRole("button", { name: "Appoint" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("was appointed");
  await expect(page.getByText("Ben Temp arranges this set until")).toBeVisible();

  // Ben arranges Sunday: order and key, and nothing else.
  await switchTo(page, ben, "Ben Temp");
  await page.goto(sundayAddress);
  await page.getByRole("link", { name: "Edit set" }).click();
  await expect(page.getByText("You are this set's temporary music director until")).toBeVisible();
  await page.getByRole("button", { name: `Move ${second} up` }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The order was saved.");
  await page.getByLabel(`Key of ${first}`).selectOption("D");
  await page.getByRole("button", { name: "Save key" }).first().click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The key was saved.");
  await expect(page.getByRole("button", { name: `Remove ${first} from the set` })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Name, date and type" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Duplicate the set" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Delete the set" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Appoint" })).toHaveCount(0);

  // Not Friday, and not the band's layer.
  await page.goto(fridayAddress);
  await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
  await expect(page.getByLabel(`Key of ${first}`)).toHaveCount(0);
  await page.goto(`/versions/${v1}/notes`);
  await expect(page.getByText("My notes (personal space)")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Bands" })).toHaveCount(0);

  // Ana removes the role; Ben's controls go away.
  await switchTo(page, ana, "Ana Lead");
  await page.goto(`${sundayAddress}/edit`);
  await page.getByRole("button", { name: "Remove the role" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("role was removed");
  await switchTo(page, ben, "Ben Temp");
  await page.goto(`${sundayAddress}/edit`);
  // Without the role, the edit page sends him back to the set, with no Edit set.
  await expect(page).toHaveURL(new RegExp(`${sundayAddress}$`));
  await expect(page.getByRole("link", { name: "Edit set" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
});
