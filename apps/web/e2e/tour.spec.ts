import { expect, test } from "@playwright/test";
import { addToSet, createSet, expectStatus, signOut, signUpAndConfirm, unique } from "./flows";

// A one-off screenshot tour for a design review (not merged).
test.use({ viewport: { width: 1280, height: 860 }, hasTouch: true });

test("tour", async ({ page }) => {
  test.setTimeout(400_000);
  const stamp = Date.now() % 1000;
  const band = `LifeStone ${stamp}`;
  const set = `Sunday ${stamp}`;
  const shoot = async (file: string) => {
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `tour/${file}.png` });
  };
  const sam = unique("sam");
  await signUpAndConfirm(page, unique("ana"), "Carlos Rivera");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(sam);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Service", date: new Date().toISOString().slice(0, 10) });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  for (const title of ["Open Road", "Lantern Bay"]) {
    await page.goto("/versions/new?song=new&q=" + encodeURIComponent(`${title} ${stamp}`));
    await page.getByLabel("Chart (ChartDown)").fill("## Verse\n> MD: Soft start.\n1 | 4 | 5 | 1\n");
    await page.getByLabel("Live").check();
    await page.getByRole("button", { name: "Publish version" }).click();
    await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
    await addToSet(page, `${band} · ${set}`);
    await expectStatus(page, "added at the end");
  }
  await page.goto("/");
  await shoot("02-home-md");
  await page.emulateMedia({ colorScheme: "dark" });
  await shoot("03-home-md-dark");
  await page.emulateMedia({ colorScheme: "light" });
  await signOut(page);
  await signUpAndConfirm(page, sam, "Sam Ortiz");
  await page.goto("/");
  await shoot("04-home-invited");
  await page.getByRole("button", { name: `Accept the invitation to ${band}` }).click();
  await expectStatus(page, "Welcome to the band.");
  await page.goto("/");
  await shoot("05-home-musician");
});
