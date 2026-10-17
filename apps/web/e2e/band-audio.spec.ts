import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  expectSignedIn,
  expectStatus,
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
} from "./flows";

const TONE = new URL("../../../fixtures/audio/practice-tone.mp3", import.meta.url).pathname;

async function switchTo(page: Page, email: string, name: string) {
  await page.goto("/");
  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expectSignedIn(page, name);
}

test("R-06.7 the MD adds the band's audio; its musicians hear it, nobody else", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const band = `Reed Band ${stamp}`;
  const ana = unique("audiomd");
  const ben = unique("audiomusician");
  const version = await createVersion(request, {
    title: `Copper Bells ${stamp}`,
    content: "---\ntempo: 120\n---\n## Verse\n1 | 4\n## Chorus\n4 | 1\n",
  });

  // Ana's band, and Ben in it.
  await signUpAndConfirm(page, ana, "Ana Audio");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Audio");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  // A musician can't add one.
  await page.goto(`/versions/${version}`);
  await expect(page.getByRole("button", { name: "Add the band's audio" })).toHaveCount(0);

  await switchTo(page, ana, "Ana Audio");
  await page.goto(`/versions/${version}`);
  await page.getByRole("button", { name: "Add the band's audio" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Band" }).click();
  await page.getByRole("option", { name: band }).click();

  // A file over 15 MB is refused before anything is uploaded.
  let uploads = 0;
  page.on("request", (sent) => {
    if (sent.url().includes("/storage/v1/object/band-audio")) uploads += 1;
  });
  await dialog.locator("input[type=file]").setInputFiles({
    name: "long-take.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.alloc(16 * 1024 * 1024),
  });
  await dialog.getByText("The band has the right to use this recording.").click();
  await expect(dialog.getByRole("button", { name: "Upload" })).toBeDisabled();
  expect(uploads).toBe(0);

  await dialog.locator("input[type=file]").setInputFiles(TONE);
  await dialog.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(`${band}'s recording · 0:08`)).toBeVisible();

  // Ben hears it; a visitor doesn't even see it.
  await switchTo(page, ben, "Ben Audio");
  await page.goto(`/versions/${version}`);
  await expect(page.getByText(`${band}'s recording · 0:08`)).toBeVisible();
  await page.goto("/");
  await signOut(page);
  await page.goto(`/versions/${version}`);
  await expect(page.getByText(`${band}'s recording`)).toHaveCount(0);
});
