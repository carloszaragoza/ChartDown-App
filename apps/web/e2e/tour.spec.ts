import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { signUpAndConfirm, unique } from "./flows";

// A one-off screenshot tour for a design review (not merged).
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

test("tour", async ({ page, request }) => {
  test.setTimeout(300_000);
  await createVersion(request, { title: "Open Road", content: "## Verse\n1 | 4\n", sourceType: "live" });
  await createVersion(request, { title: "Lantern Bay", content: "## Verse\n1 | 4\n" });
  await signUpAndConfirm(page, unique("tour"), "Ana Rivera");
  const shoot = async (file: string) => {
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `tour/${file}.png` });
  };
  await page.goto("/catalog");
  await shoot("01-catalog");
  await page.goto("/versions/new?q=Open");
  await shoot("02-find-song");
  await page.goto("/versions/new?song=new&q=Harbor%20Lights");
  await shoot("03-new-version");
  await page.getByRole("button", { name: "Publish version" }).hover();
  await shoot("04-publish-tooltip");
  await page.getByLabel("Live").check();
  await page.getByLabel("Chart (ChartDown)").fill("## Intro\n1 | 4\n\n## Verse\n> MD: Soft start.\n1 | 4 | 5 | 6m\n\n## Chorus\n4 | ??? | 1\n");
  await shoot("05-new-version-filled");
  await page.getByLabel("Chart (ChartDown)").fill("## Intro\n1 | 4\n\n## Verse\n> MD: Soft start.\n1 | 4 | 5 | 6m\n\n## Chorus\n4 | 5 | 1\n");
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  await page.goto(`${new URL(page.url()).pathname}/edit`);
  await shoot("06-editor");
  await page.emulateMedia({ colorScheme: "dark" });
  await shoot("07-editor-dark");
  await page.goto("/catalog");
  await shoot("08-catalog-dark");
});
