import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { addToSet, chooseSection, signUpAndConfirm, unique } from "./flows";

// A one-off screenshot tour for a design review (not merged).
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

const CHART =
  "---\nkey: G\ntempo: 76\n---\n## Intro\n1 | 4\n\n## Verse\n> MD: Soft start, says the author.\n1 | 4 | 5 | 6m\n\n## Chorus\n4 | 5 | 6m | 1\n";

test("tour", async ({ page, request }) => {
  test.setTimeout(400_000);
  const other = await createVersion(request, {
    title: "Open Road",
    content: CHART,
    sourceType: "live",
    album: "Night Sessions",
  });
  await signUpAndConfirm(page, unique("tour"), "Ana Rivera");
  const shoot = async (file: string) => {
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `tour/${file}.png` });
  };
  await page.goto(`/versions/${other}`);
  await shoot("01-version-reader");
  await page.getByRole("button", { name: "More actions" }).click();
  await shoot("02-more-menu");
  await page.getByRole("menuitem", { name: "Report" }).click();
  await shoot("03-report");
  await page.goto(`/versions/${other}/notes`);
  await chooseSection(page, "Verse");
  await page.getByLabel("Keys", { exact: true }).check();
  await page.getByLabel("Note", { exact: true }).fill("Pad underneath the vocal.");
  await page.getByRole("button", { name: "Add note" }).click();
  await page.waitForTimeout(1500);
  await shoot("04-notes");
  await page.getByRole("link", { name: /^Edit the note/ }).first().click();
  await shoot("05-notes-edit");
  // Own version for the owner's view.
  await page.goto("/versions/new?song=new&q=Harbor%20Lights");
  await page.getByLabel("Own arrangement").check();
  await page.getByLabel("Chart (ChartDown)").fill(CHART);
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const mine = new URL(page.url()).pathname;
  await shoot("06-version-owner");
  await page.goto(`${mine}/history`);
  await shoot("07-history");
  await page.goto(`${mine}/revisions/1`);
  await shoot("08-revision");
  await page.goto(`${mine}/make-private`);
  await shoot("09-make-private");
  const song = await page.request.get("/catalog");
  void song;
  await page.goto("/catalog?q=Open%20Road");
  await page.getByRole("button", { name: /All about/ }).first().click().catch(() => {});
  await page.getByRole("link", { name: /All about/ }).first().click().catch(() => {});
  await shoot("10-song");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/versions/${other}?view=letters&key=A`);
  await shoot("11-version-dark-letters");
  void addToSet;
});
