import { expect, test } from "@playwright/test";
import { signOut, signUpAndConfirm, unique, writeChart } from "./flows";

test("R-03.1 the preview updates without reloading", async ({ page }) => {
  const title = `Ember Hill ${Date.now()}`;
  await signUpAndConfirm(page, unique("editor"), "Eli Editor");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 4 | 5 | 1\n");
  await page.getByLabel("Studio recording").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;

  await page.getByRole("main").getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${address}/edit$`));
  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeDisabled();
  await expect(page.getByText("No warnings")).toBeVisible();

  // Typing changes the preview, and the page never reloads.
  await page.evaluate(() => Object.assign(window, { stillHere: true }));
  const text = page.getByLabel("Chart (ChartDown)");
  await text.fill("## Verse\n1 | 4 | 5 | 1\n\n## Coda\n4 | ??? | 1\n");
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview.getByRole("heading", { name: "Coda" })).toBeVisible();

  // The warning names its line and takes the cursor there.
  const warning = page.getByRole("button", { name: /Line 5:.*\?\?\?/ }).first();
  await expect(warning).toContainText("Can’t read “???”");
  await warning.click();
  await expect(text).toBeFocused();
  const selected = await text.evaluate((field: HTMLTextAreaElement) =>
    field.value.slice(field.selectionStart, field.selectionEnd),
  );
  expect(selected).toBe("4 | ??? | 1");
  expect(await page.evaluate(() => "stillHere" in window)).toBe(true);

  // Warnings never block a save.
  await expect(save).toBeEnabled();
  await save.click();
  await expect(
    page.getByRole("main").getByRole("status").filter({ hasText: "Saved as revision 2." }).first(),
  ).toBeVisible();
  // R-03.1 a save returns to the version (T-2404).
  await expect(page).toHaveURL(new RegExp(`${address}\\?saved=2$`));
  await expect(page.getByRole("heading", { name: "Coda" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "History" }).click();
  await expect(
    page.getByRole("list", { name: "History" }).getByRole("listitem").first(),
  ).toContainText("Revision 2");

  // R-02.4 choosing Private in the editor opens its own confirmation; nothing changes yet.
  await page.goto(`${address}/edit`);
  await page
    .getByRole("radiogroup", { name: "Visibility" })
    .getByRole("radio", { name: "Private" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${address}/make-private$`));

  // Only the owner edits (R-02.6).
  await page.goto("/");
  await signOut(page);
  await page.goto(address);
  await expect(page.getByRole("main").getByRole("link", { name: "Edit", exact: true })).toHaveCount(
    0,
  );
  expect((await page.goto(`${address}/edit`))?.status()).toBe(404);
});

test("R-03.1 saving refuses a version that changed elsewhere and keeps the text", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const title = `Twin Tabs ${Date.now()}`;
  await signUpAndConfirm(page, unique("tabs"), "Tess Tabs");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 4\n");
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const edit = `${new URL(page.url()).pathname}/edit`;

  // Two tabs open the editor; the second saves first.
  await page.goto(edit);
  const other = await context.newPage();
  await other.goto(edit);
  await writeChart(other, "## Verse\n1 | 5\n");
  await other.getByRole("button", { name: "Save" }).click();
  await expect(
    other.getByRole("main").getByRole("status").filter({ hasText: "Saved as revision 2." }).first(),
  ).toBeVisible();

  await writeChart(page, "## Verse\n1 | 6m\n");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: "This version changed since you opened it" })
      .first(),
  ).toBeVisible();
  await expect(page.getByLabel("Chart (ChartDown)")).toHaveValue("## Verse\n1 | 6m\n");
  await context.close();
});

test("R-03.1 Cancel leaves the editor for the version, asking first when there are changes", async ({
  page,
}) => {
  const title = `Willow Gate ${Date.now()}`;
  await signUpAndConfirm(page, unique("cancel"), "Cass Cancel");
  await page.goto(`/versions/new?song=new&q=${encodeURIComponent(title)}`);
  // R-02.1 the title is written once: in the details, not in the chart's text (T-2404).
  await expect(page.getByLabel("Song title")).toHaveValue(title);
  await expect(page.getByLabel("Chart (ChartDown)")).not.toHaveValue(/title:/);
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;

  await page.goto(`${address}/edit`);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("region", { name: "Song details" })).toContainText("Cass Cancel");
  await expect(page.getByLabel("Chart (ChartDown)")).not.toHaveValue(/title:/);
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${address}$`));

  await page.goto(`${address}/edit`);
  await writeChart(page, "## Verse\n6m | 4\n");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const ask = page.getByRole("alertdialog", { name: "Leave without saving?" });
  await ask.getByRole("button", { name: "Keep writing" }).click();
  await expect(page.getByLabel("Chart (ChartDown)")).toHaveValue("## Verse\n6m | 4\n");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await ask.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(new RegExp(`${address}$`));
  // The starter's chorus is still there: nothing was saved.
  await expect(page.getByRole("heading", { name: "Chorus" })).toBeVisible();
});

test("R-02.2 the owner changes the version's source in the editor", async ({ page }) => {
  const title = `Linen Harbor ${Date.now()}`;
  await signUpAndConfirm(page, unique("source"), "Sol Source");
  await page.goto(`/versions/new?song=new&q=${encodeURIComponent(title)}`);
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;

  await page.goto(`${address}/edit`);
  const details = page.getByRole("region", { name: "Song details" });
  // A wrong year is refused, with its message, and nothing changes.
  await details.getByLabel("Year").fill("12");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "year" }).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${address}/edit$`));

  await details.getByLabel("Year").fill("2024");
  await details.getByLabel("Album").fill("Harbor Nights");
  await details.getByLabel("YouTube link").fill("https://www.youtube.com/watch?v=hBL9EBKB5DI");
  await details.getByLabel("Acoustic").check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Only the source changed: back to the version, with no new revision.
  await expect(page).toHaveURL(new RegExp(`${address}$`));
  await expect(page.getByText("Acoustic · Album: Harbor Nights · 2024")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play the video" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Saved as revision" })).toHaveCount(0);
});

test("R-03.1 the separator between the text and the chart gives either more width, and is kept", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await signUpAndConfirm(page, unique("split"), "Sid Split");
  await page.goto("/versions/new?song=new&q=Wide%20Field");
  const text = page.getByRole("region", { name: "Chart", exact: true });
  const before = (await text.boundingBox())?.width ?? 0;
  const handle = page.getByRole("separator", { name: "Resize the text and the chart" });
  const box = await handle.boundingBox();
  if (!box) throw new Error("no separator");
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 200, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await text.boundingBox())?.width ?? 0)
    .toBeGreaterThan(before + 100);
  const widened = (await text.boundingBox())?.width ?? 0;
  await page.reload();
  await expect
    .poll(async () => Math.round((await text.boundingBox())?.width ?? 0))
    .toBe(Math.round(widened));
});
