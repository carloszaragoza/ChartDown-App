import { expect, test } from "@playwright/test";
import { signOut, signUpAndConfirm, unique } from "./flows";

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
  await expect(save).toBeDisabled();

  await page.getByRole("link", { name: "View version" }).click();
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
  await other.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 5\n");
  await other.getByRole("button", { name: "Save" }).click();
  await expect(
    other.getByRole("main").getByRole("status").filter({ hasText: "Saved as revision 2." }).first(),
  ).toBeVisible();

  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 6m\n");
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
