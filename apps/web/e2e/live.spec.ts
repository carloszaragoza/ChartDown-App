import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  addToSet,
  chooseInstrument,
  createSet,
  expectSignedIn,
  expectStandNow,
  expectStatus,
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  unique,
} from "./flows";

const FIRST = "## Verse\n1 | 4\n## Chorus\n4 | 5\n## Bridge\n6m | 4\n";
const SECOND = "## Intro\n1 | 5\n## Outro\n4 | 1\n";
const FOLLOW = { timeout: 10_000 };

async function pressOn(page: Page, key: string) {
  await page.locator("body").click({ position: { x: 5, y: 400 } });
  await page.keyboard.press(key);
}

test("R-12.1 R-12.2 R-12.3 R-12.4 R-12.5 R-12.6 R-12.8 R-12.10 the band follows the MD live, hands-free, looks ahead and comes back", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const band = `Lantern Live ${stamp}`;
  const set = `Sunday ${stamp}`;
  const ana = unique("livemd");
  const luis = unique("livebass");
  const first = await createVersion(request, { title: `Open Field ${stamp}`, content: FIRST });
  const second = await createVersion(request, { title: `Low Tide ${stamp}`, content: SECOND });

  // Ana's band with Luis on bass in Sunday's lineup.
  await signUpAndConfirm(page, ana, "Ana Live");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(luis);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, luis, "Luis Live");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await page.goto("/");
  await signOut(page);
  await signIn(page, ana, PASSWORD);
  await expectSignedIn(page, "Ana Live");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Service" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  for (const id of [first, second]) {
    await page.goto(`/versions/${id}`);
    await addToSet(page, `${band} · ${set}`);
  }
  await page.goto(`${setAddress}/edit`);
  await chooseInstrument(page, "Luis Live", "Bass");
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expectStatus(page, "The lineup was saved.");

  // R-12.1 Ana goes live from stand mode's View.
  await page.goto(`${setAddress}/songs/1/stand`);
  await page.getByRole("button", { name: "View options" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Go live" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("You lead", { exact: false })).toBeVisible(FOLLOW);

  // R-12.2 Luis sees Live now on Home and joins with one tap, on Ana's song.
  const luisDevice = await browser.newContext();
  const luisPage = await luisDevice.newPage();
  await signIn(luisPage, luis, PASSWORD);
  await expectSignedIn(luisPage, "Luis Live");
  await luisPage.goto("/");
  await expect(luisPage.getByText(`Live now: ${set}`)).toBeVisible(FOLLOW);
  await luisPage.getByRole("link", { name: "Join", exact: true }).click();
  await expect(luisPage).toHaveURL(new RegExp(`${setAddress}/songs/1/stand`));
  await expect(luisPage.getByText("Following Ana Live")).toBeVisible(FOLLOW);
  await expectStandNow(luisPage, "Verse");
  // The leader sees who joined.
  await expect(page.getByText("You lead 1 musician")).toBeVisible(FOLLOW);

  // R-12.3 Ana moves; Luis's stand mode moves with her.
  await pressOn(page, "ArrowRight");
  await expectStandNow(page, "Chorus");
  await expect(luisPage.locator('.cd-stand-card[data-state="current"]')).toContainText(
    "Chorus",
    FOLLOW,
  );

  // R-12.4 Ana marks the Bridge next; Luis sees it before she moves.
  await page.getByRole("button", { name: "Live options" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bridge" }).click();
  await page.keyboard.press("Escape");
  await expect(luisPage.getByText("Next: Bridge")).toBeVisible(FOLLOW);

  // R-12.5 Luis looks ahead; Ana's moves wait for him until Back to live.
  await pressOn(luisPage, "ArrowRight");
  await expectStandNow(luisPage, "Bridge");
  const back = luisPage.getByRole("button", { name: "Back to live" });
  await expect(back).toBeVisible();
  await pressOn(page, "ArrowLeft");
  await expectStandNow(page, "Verse");
  await luisPage.waitForTimeout(1500);
  await expectStandNow(luisPage, "Bridge");
  await back.click();
  await expectStandNow(luisPage, "Verse");

  // R-12.6 Ana goes on to the next song; Luis goes with her.
  await pressOn(page, "ArrowRight");
  await pressOn(page, "ArrowRight");
  await expectStandNow(page, "Bridge");
  await pressOn(page, "ArrowRight");
  await expect(page).toHaveURL(new RegExp(`${setAddress}/songs/2/stand`));
  await expect(luisPage).toHaveURL(new RegExp(`${setAddress}/songs/2/stand`), FOLLOW);
  await expectStandNow(luisPage, "Intro");

  // R-12.10 Ana ends live mode; Luis stays where he was and is told.
  await page.getByRole("button", { name: "Live options" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "End live mode" }).click();
  await expect(luisPage.getByText("Live mode ended. You stay where you were.")).toBeVisible(FOLLOW);
  await expectStandNow(luisPage, "Intro");
  await luisDevice.close();
});
