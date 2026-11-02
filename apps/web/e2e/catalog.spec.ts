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
  await page.getByRole("link", { name: "Songs", exact: true }).click();
  await page.getByLabel("Search by title, artist or album").fill(title);
  const song = page.getByRole("treeitem", { name: title });
  await expect(song).toBeVisible();
  await expect(song).toContainText("2 versions");

  // Search by album, then narrow by source. The field filters as it is typed.
  await page.getByLabel("Search by title, artist or album").fill("Night Sessions");
  await expect(page).toHaveURL(/q=Night(\+|%20)Sessions/);
  await expect(song).toContainText("2 versions");
  await page.getByLabel("Search by title, artist or album").fill(title);
  await expect(page).not.toHaveURL(/Night/);
  await page.getByRole("button", { name: "Live" }).click();
  await expect(page).toHaveURL(/source=live/);
  await expect(song).toContainText("Live");
  await expect(song).not.toContainText("2 versions");
  await page.getByRole("button", { name: "Acoustic" }).click();
  await expect(page.getByText("No songs match.")).toBeVisible();

  // The song lists its two public versions; the private one never appears.
  await page.getByRole("button", { name: "All sources" }).click();
  await expect(page).not.toHaveURL(/source=/);
  await song.getByRole("button", { name: "Toggle children" }).click();
  const versions = page.getByRole("treeitem", { name: /Key C/ });
  await expect(versions).toHaveCount(2);
  const liveRow = versions.filter({ hasText: "Live" });
  await expect(liveRow).toContainText("Key C · 4/4");
  await expect(liveRow).toContainText("by ChartDown");
  // T-2812 everything in the catalog is public: no row says so. Fork is on the version.
  await expect(page.getByText("Public", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Fork/ })).toHaveCount(0);
  await expect(page.locator(`a[href="/versions/${hidden}"]`)).toHaveCount(0);
  await liveRow.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/versions/${live}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});

test("R-02.10 a version's whole row opens it, not only its Open button", async ({
  page,
  request,
}) => {
  const title = `Slate Harbor ${Date.now()}`;
  const id = await createVersion(request, {
    title,
    content: "## Verse\n1 | 4\n",
    sourceType: "live",
    album: "Low Tide",
  });
  await page.goto(`/catalog?q=${encodeURIComponent(title)}`);
  // The row is the way in: one version, so the title opens it.
  await page.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${id}$`));
});

test("R-02.10 back from a version, the catalog keeps the search and the open song", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  await createVersion(request, { title: `Ember Road ${stamp} A`, content: "## Verse\n1 | 4\n" });
  const second = await createVersion(request, {
    title: `Ember Road ${stamp} B`,
    content: "## Verse\n1 | 5\n",
    album: "Far Lanterns",
  });
  await page.goto(`/catalog?q=${encodeURIComponent(`Ember Road ${stamp}`)}`);
  await page.getByRole("link", { name: `Ember Road ${stamp} B` }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${second}$`));

  await page.getByRole("main").getByRole("link", { name: "Songs", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog\?/);
  await expect(page.getByLabel("Search by title, artist or album")).toHaveValue(
    `Ember Road ${stamp}`,
  );
  const open = page.getByRole("treeitem", { name: `Ember Road ${stamp} B` });
  await expect(open).toBeVisible();
  await expect(open).toBeInViewport();
});
