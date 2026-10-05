import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import { signOut, signUpAndConfirm, unique } from "./flows";

// Original example songs only; no lyrics (CLAUDE.md).
async function startNewSong(page: Page, title: string) {
  await page.getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("No songs match")).toBeVisible();
  await page.getByRole("link", { name: "Create a new song" }).click();
}

test("R-02.2 saving without a source shows a clear error", async ({ page }) => {
  const title = `Lantern Bay ${Date.now()}`;
  await signUpAndConfirm(page, unique("nosource"), "Ana Source");
  await startNewSong(page, title);
  await expect(page.getByLabel("Song title")).toHaveValue(title);
  await expect(page.getByLabel("Arrangement by")).toHaveValue("Ana Source");
  await page.getByRole("button", { name: "Publish version" }).click();

  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toContainText("Choose a source");
  await expect(page.getByRole("group", { name: "Source" })).toBeFocused();
  // Nothing typed is lost.
  await expect(page.getByLabel("Song title")).toHaveValue(title);

  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});

test("R-02.3 a new version is public: a visitor reads it", async ({ page }) => {
  const title = `Harbor Lights ${Date.now()}`;
  await signUpAndConfirm(page, unique("publisher"), "Ben Public");
  await startNewSong(page, title);
  await page.getByLabel("Artists").fill("ChartDown examples");
  await page.getByLabel("Studio recording").check();
  await page.getByLabel("Year (optional)").fill("2026");
  await expect(page.getByText("shared under CC0")).toBeVisible();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = page.url();

  await page.goto("/");
  await signOut(page);
  await page.goto(address);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Arrangement by Ben Public")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chorus" })).toBeVisible();
});

test("R-02.1 a version of a song already in the catalog", async ({ page, request }) => {
  const title = `Quiet Mile ${Date.now()}`;
  await createVersion(request, { title, content: "## Verse\n1 | 4" });
  await signUpAndConfirm(page, unique("second"), "Cleo Second");
  await page.getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Use ${title}` }).click();
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByLabel("Song title")).toHaveCount(0);
  await page.getByLabel("Acoustic").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Arrangement by Cleo Second")).toBeVisible();
});

test("R-01.4 creating a version asks a visitor to sign in", async ({ page }) => {
  await page.goto("/versions/new");
  await expect(page).toHaveURL(
    /\/auth\/sign-in\?next=%2Fversions%2Fnew|\/auth\/sign-in\?next=\/versions\/new/,
  );
});
