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
  // The only result is the open song: a card with its versions (Design Handoff 2.0 screen 04).
  const results = page.getByRole("main").getByRole("heading", { level: 2 });
  await expect(results).toHaveCount(1);
  await expect(results).toHaveText(title);
  const card = page.getByRole("main").filter({ hasText: title });
  await expect(card).toContainText("2 versions");

  // Search by album, then narrow by source.
  await page.getByLabel("Search by title, artist or album").fill("Night Sessions");
  await page.getByRole("button", { name: "Search" }).click();
  // The album finds the song; only the source type narrows how many versions are counted.
  await expect(page).toHaveURL(/q=Night\+Sessions/);
  await expect(results).toHaveText(title);
  await expect(card).toContainText("2 versions");
  await page.getByLabel("Search by title, artist or album").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).not.toHaveURL(/Night/);
  const source = page.getByRole("radiogroup", { name: "Source" });
  await source.getByRole("radio", { name: "Live" }).click();
  await expect(page).toHaveURL(/source=live/);
  await expect(card).toContainText("1 version");
  await source.getByRole("radio", { name: "Acoustic" }).click();
  await expect(page.getByText("No songs match.")).toBeVisible();

  // The song lists its two public versions; the private one never appears.
  await source.getByRole("radio", { name: "All sources" }).click();
  await expect(page).not.toHaveURL(/source=/);
  // The only result opens in place, with its versions to open or fork.
  const versions = page.getByRole("list", { name: `Versions of ${title}` }).getByRole("listitem");
  await expect(versions).toHaveCount(2);
  await expect(versions.filter({ hasText: "Live" })).toContainText("Key C · 4/4");
  await expect(versions.filter({ hasText: "Live" })).toContainText("Album: Night Sessions");
  await expect(versions.first().getByRole("link", { name: `Fork ${title} by` })).toBeVisible();
  await expect(page.locator(`a[href="/versions/${hidden}"]`)).toHaveCount(0);
  await versions
    .filter({ hasText: "Live" })
    .getByRole("link", { name: /^Open / })
    .click();
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
  // A tap on the row's title, away from its buttons.
  await page.getByRole("main").getByText("Low Tide").first().click();
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
  await page.getByRole("link", { name: new RegExp(`Ember Road ${stamp} B`) }).click();
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(
    `Ember Road ${stamp} B`,
  );
  await page.getByRole("main").getByText("Far Lanterns").first().click();
  await expect(page).toHaveURL(new RegExp(`/versions/${second}$`));

  await page.getByRole("link", { name: "Back to the catalog" }).click();
  await expect(page).toHaveURL(/\/catalog\?/);
  await expect(page.getByLabel("Search by title, artist or album")).toHaveValue(
    `Ember Road ${stamp}`,
  );
  const open = page.getByRole("main").getByRole("heading", { level: 2 });
  await expect(open).toHaveText(`Ember Road ${stamp} B`);
  await expect(open).toBeInViewport();
});
