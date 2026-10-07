import { expect, test, type Page } from "@playwright/test";
import {
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
  expectStatus,
  setInstruments,
  expectSignedIn,
} from "./flows";

async function openBand(page: Page, name: string) {
  await page.goto("/bands");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("R-04.2 the MD invites, the musician accepts, and whoever leaves loses access", async ({
  page,
}) => {
  const band = `Harbor Band ${Date.now()}`;
  const ana = unique("ana");
  const ben = unique("ben");
  const cleo = unique("cleo");

  // Ana creates a band (R-04.1) and invites Ben and Cleo, who have no account yet.
  await signUpAndConfirm(page, ana, "Ana Lead");
  await page.getByRole("link", { name: "Bands" }).click();
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await expect(page.getByRole("heading", { level: 1, name: band })).toBeVisible();
  await expect(page.getByText("You are the music director of this band.")).toBeVisible();
  for (const email of [ben, cleo]) {
    await page.getByLabel("Their email").fill(email.toUpperCase());
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expectStatus(page, "Invitation sent.");
  }
  const pending = page.getByRole("region", { name: "Pending invitations" });
  await expect(pending.getByRole("listitem")).toHaveCount(2);
  await page.goto("/");
  await signOut(page);

  // Ben signs up with that email; the invitation is waiting, and he accepts.
  await signUpAndConfirm(page, ben, "Ben Keys");
  const invitations = page.getByRole("region", { name: "Invitations" });
  await expect(invitations).toContainText(`Ana Lead invites you to ${band}.`);
  await invitations.getByRole("button", { name: `Accept the invitation to ${band}` }).click();
  await expectStatus(page, "Welcome to the band.");
  await expect(page.getByText("You play in this band.")).toBeVisible();
  const address = new URL(page.url()).pathname;
  await page.goto("/");
  await signOut(page);

  // Ana sets Ben's default instrument (R-04.3).
  await signIn(page, ana, PASSWORD);
  await expectSignedIn(page, "Ana Lead");
  await openBand(page, band);
  await setInstruments(page, "Ben Keys", ["Bass"]);
  await expectStatus(page, "The instruments were saved.");
  await expect(page.getByRole("row").filter({ hasText: "Ben Keys" })).toContainText("Bass");
  await expect(page.getByRole("button", { name: "Leave the band" })).toHaveCount(0);
  await page.goto("/");
  await signOut(page);

  // Ben leaves and loses access at once (R-04.4).
  await signIn(page, ben, PASSWORD);
  await expectSignedIn(page, "Ben Keys");
  await openBand(page, band);
  // Leaving is in the band's Settings tab (Design Handoff 2.0, the screens table).
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Leave the band" }).click();
  await expectStatus(page, "You left the band.");
  await expect(page.getByRole("link", { name: band, exact: true })).toHaveCount(0);
  expect((await page.goto(address))?.status()).toBe(404);
  await page.goto("/");
  await signOut(page);

  // Cleo declines.
  await signUpAndConfirm(page, cleo, "Cleo Drums");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Decline the invitation to ${band}` })
    .click();
  await expectStatus(page, "You declined the invitation.");
  await expect(page.getByRole("region", { name: "Invitations" })).toHaveCount(0);
  expect((await page.goto(address))?.status()).toBe(404);
});
