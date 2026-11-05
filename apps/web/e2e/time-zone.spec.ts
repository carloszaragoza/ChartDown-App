import { expect, test } from "@playwright/test";
import { signUpAndConfirm, unique } from "./flows";

// Pittsburgh's clock, hours behind the server's UTC.
const ZONE = "America/New_York";
test.use({ timezoneId: ZONE });

test("F-014 the time a change was kept is the person's own, not UTC's", async ({ page }) => {
  await signUpAndConfirm(page, unique("zone"), "Zoe Zone");
  // The browser has told the server its time zone; a full load reads it, as any later visit.
  await page.reload();
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(`Eastern Time ${Date.now()}`);
  await expect(page).toHaveURL(/[?&]q=/);
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 4 | 5 | 1\n");
  await page.getByLabel("Studio recording").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  await page.getByRole("main").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("menuitem", { name: "Text (ChartDown)" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 4 | 5 | 5\n");

  // The minute now in New York, or the next one should the clock turn meanwhile.
  const clock = (at: number) =>
    new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: ZONE }).format(at);
  const now = Date.now();
  const kept = page.getByRole("status").filter({ hasText: "Kept on this device" });
  await expect(kept).toBeVisible();
  await expect(kept).toHaveText(new RegExp(`(${clock(now)}|${clock(now + 60_000)})`));
});
