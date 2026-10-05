import { expect, test } from "@playwright/test";
import { createVersion, songOf } from "./admin";

test("R-02.10 a visitor searches the catalog and opens a version", async ({ page, request }) => {
  // One song: a live and a studio version in public, and a private acoustic one.
  const title = `Copper Lake ${Date.now()}`;
  const live = await createVersion(request, {
    title,
    content: "## Verse\n1 | 4\n",
    sourceType: "live",
    album: "Night Sessions",
  });
  const songId = await songOf(request, live);
  await createVersion(request, {
    title,
    content: "## Verse\n1 | 5\n",
    songId,
    sourceType: "studio",
  });
  const hidden = await createVersion(request, {
    title,
    content: "## Verse\n6m | 4\n",
    songId,
    sourceType: "acoustic",
    visibility: "private",
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Catalog" }).click();
  await page.getByLabel("Search by title, artist or album").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  const results = page.getByRole("list", { name: "Songs" }).getByRole("listitem");
  await expect(results).toHaveCount(1);
  await expect(results).toContainText(title);
  await expect(results).toContainText("2 versions");

  // Search by album, then narrow by source.
  await page.getByLabel("Search by title, artist or album").fill("Night Sessions");
  await page.getByRole("button", { name: "Search" }).click();
  // The album finds the song; only the source type narrows how many versions are counted.
  await expect(page).toHaveURL(/q=Night\+Sessions/);
  await expect(results.filter({ hasText: title })).toContainText("2 versions");
  await page.getByLabel("Search by title, artist or album").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).not.toHaveURL(/Night/);
  await page
    .getByRole("navigation", { name: "Source" })
    .getByRole("link", { name: "Live" })
    .click();
  await expect(page).toHaveURL(/source=live/);
  await expect(results).toContainText("1 version");
  await page
    .getByRole("navigation", { name: "Source" })
    .getByRole("link", { name: "Acoustic" })
    .click();
  await expect(page.getByText("No songs match.")).toBeVisible();

  // The song lists its two public versions; the private one never appears.
  await page.getByRole("navigation", { name: "Source" }).getByRole("link", { name: "All" }).click();
  await results.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const versions = page.getByRole("list", { name: `Versions of ${title}` }).getByRole("listitem");
  await expect(versions).toHaveCount(2);
  await expect(page.locator(`a[href="/versions/${hidden}"]`)).toHaveCount(0);
  await versions.filter({ hasText: "Live" }).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/versions/${live}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});
