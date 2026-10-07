import { expect, test } from "@playwright/test";
import { createVersion, makeAdmin } from "./admin";
import { chooseSection, signUpAndConfirm, unique } from "./flows";

// A one-off screenshot tour for a design review (not merged).
const CHART = "## Intro\n1 | 4\n\n## Verse\n1 | 4 | 5 | 6m\n\n## Chorus\n4 | 5 | 6m | 1\n";
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

test("tour", async ({ page, request }) => {
  test.setTimeout(600_000);
  const stamp = Date.now();
  const band = `Ash Band`;
  const name = "Ana Rivera";
  const v1 = await createVersion(request, { title: `Long Road`, content: CHART });
  const v2 = await createVersion(request, { title: `Short Way`, content: CHART });
  await signUpAndConfirm(page, unique("tour"), name);
  await makeAdmin(request, name);
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.goto("/bands");
  await page.getByRole("main").getByRole("link", { name: band }).first().click();
  const bandAddress = new URL(page.url()).pathname;
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(`Evensong ${stamp % 100}`);
  await page.getByLabel("Type").selectOption({ label: "Concert" });
  await page.getByRole("button", { name: "Create set" }).click();
  const setAddress = new URL(page.url()).pathname;
  for (const version of [v1, v2]) {
    await page.goto(`/versions/${version}`);
    await page.getByLabel("Add to a set").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("main").getByRole("status").first()).toBeVisible();
  }
  await page.goto(`/versions/${v1}/notes`);
  await page.getByRole("navigation", { name: "Bands" }).getByRole("link", { name: band }).click();
  await chooseSection(page, "Verse");
  await page.getByLabel("Note", { exact: true }).fill("Everyone soft until the chorus.");
  await page.getByRole("button", { name: "Add note" }).click();
  await page.waitForTimeout(1500);

  const shoot = async (file: string, path: string) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `tour/${file}.png`, fullPage: true });
  };
  await shoot("01-notices", "/notices");
  await shoot("02-sets", "/sets");
  await shoot("03-set", setAddress);
  await shoot("04-set-edit", `${setAddress}/edit`);
  await shoot("05-set-song", `${setAddress}/songs/1`);
  await shoot("06-stand", `${setAddress}/songs/1/stand`);
  await shoot("07-catalog", "/catalog");
  await shoot("08-version", `/versions/${v1}`);
  await shoot("09-new-version", "/versions/new");
  await shoot("10-editor", `/versions/${v1}/edit`);
  await shoot("11-notes", `/versions/${v1}/notes`);
  await shoot("12-history", `/versions/${v1}/history`);
  await shoot("13-mine", "/versions/mine");
  await shoot("14-bands", "/bands");
  await shoot("15-band", bandAddress);
  await shoot("16-profile", "/profile");
  await shoot("17-admin", "/admin");
  await shoot("18-instruments", "/admin/instruments");
  await shoot("19-invites", "/admin/invites");
  await shoot("20-reports", "/admin/reports");
  await page.emulateMedia({ colorScheme: "dark" });
  await shoot("21-set-dark", setAddress);
  await shoot("22-notices-dark", "/notices");
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/sets");
  const nav = page.getByRole("navigation", { name: "Side navigation" });
  const box = await nav.boundingBox();
  await page.screenshot({
    path: "tour/23-nav-footer.png",
    clip: { x: 0, y: (box?.height ?? 820) - 200, width: box?.width ?? 260, height: 200 },
  });
});
