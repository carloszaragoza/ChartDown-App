import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { chooseSection, signOut, signUpAndConfirm, unique } from "./flows";

const CHART = "## Verse\n1 | 4\n\n## Chorus\n4 | 5\n\n## Chorus\n4 | 1\n";
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

test("R-03.5 a new note is saved in the layer and the public version doesn't change", async ({
  page,
  request,
}) => {
  const title = `Night Ferry ${Date.now()}`;
  const id = await createVersion(request, { title, content: CHART });
  const saved = async () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const response = await request.get(`${url()}/rest/v1/revisions`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      params: { select: "number,content", version_id: `eq.${id}` },
    });
    return response.json();
  };
  const before = await saved();

  await signUpAndConfirm(page, unique("md"), "Mia Director");
  await page.goto(`/versions/${id}`);
  await page.getByRole("link", { name: "My notes" }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${id}/notes`));
  await expect(page.getByText("My notes (personal space)")).toBeVisible();

  // A note for keys on bar 2 of the second Chorus.
  await chooseSection(page, "Chorus (2nd)");
  await expect(page.getByRole("heading", { name: "Add a note to Chorus (2nd)" })).toBeVisible();
  await page.getByLabel("Bar (optional)").fill("2");
  await page.getByLabel("Keys", { exact: true }).check();
  await page.getByLabel("Note", { exact: true }).fill("Pad swell into the last bar.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");

  // The page stays on that section, with the note in it; the first Chorus has none.
  const secondChorus = page.locator("#section-3");
  await expect(secondChorus).toContainText("Bar 2 · Pad swell into the last bar.");
  await expect(secondChorus).toContainText("Keys");
  const sections = page.getByRole("navigation", { name: "Sections" });
  await expect(sections.getByRole("link", { name: "Chorus (2nd) 1 note" })).toBeVisible();
  await expect(sections.getByRole("link", { name: "Chorus (1st) 0 notes" })).toBeVisible();

  // Editing: a note for everyone in the Verse.
  await page.getByRole("link", { name: "Edit the note: Pad swell into the last bar." }).click();
  await expect(page.getByRole("heading", { name: "Edit the note" })).toBeVisible();
  await page.locator('select[name="anchor"]').selectOption({ label: "Verse" });
  await page.getByLabel("Bar (optional)").fill("");
  await page.getByLabel("Keys", { exact: true }).uncheck();
  await page.getByLabel("Note", { exact: true }).fill("Everyone soft until the chorus.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");
  await expect(page.locator("#section-1")).toContainText("Everyone soft until the chorus.");
  await expect(sections.getByRole("link", { name: "Verse 1 note" })).toBeVisible();
  await expect(sections.getByRole("link", { name: "Chorus (2nd) 0 notes" })).toBeVisible();

  // The public version is untouched, and outside a set it shows no layer (R-06.5).
  expect(await saved()).toEqual(before);
  await page.goto(`/versions/${id}`);
  await expect(page.getByText("Everyone soft until the chorus.")).toHaveCount(0);

  // Deleting, from the note's edit form.
  await page.goto(`/versions/${id}/notes`);
  await page.getByRole("link", { name: "Edit the note: Everyone soft until the chorus." }).click();
  await page
    .getByRole("button", { name: "Delete the note: Everyone soft until the chorus." })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was deleted.");
  await expect(sections.getByRole("link", { name: "Verse 0 notes" })).toBeVisible();

  // Nobody else reaches the notes page.
  await page.goto("/");
  await signOut(page);
  expect((await page.goto(`/versions/${id}/notes`))?.status()).toBe(404);
});

test("R-00.2 a note whose section is gone is marked unplaced, not lost, and anchored again", async ({
  page,
}) => {
  const title = `Paper Boats ${Date.now()}`;
  await signUpAndConfirm(page, unique("anchor"), "Rae Anchor");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page
    .getByLabel("Chart (ChartDown)")
    .fill("## Verse\n> MD: Start soft, the author's way.\n1 | 4\n\n## Chorus\n4 | 5\n");
  await page.getByLabel("Own arrangement").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;

  // A band note on the Chorus.
  await page.goto(`${address}/notes`);
  await chooseSection(page, "Chorus");
  await page.getByLabel("Note", { exact: true }).fill("Big finish, everyone.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");
  await expect(page.locator("#section-2")).toContainText("Big finish, everyone.");

  // The author renames the Chorus.
  await page.goto(`${address}/edit`);
  await page
    .getByLabel("Chart (ChartDown)")
    .fill("## Verse\n> MD: Start soft, the author's way.\n1 | 4\n\n## Refrain\n4 | 5\n");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Saved as revision 2.");

  // The note is unplaced but kept, and can be anchored again.
  await page.goto(`${address}/notes`);
  const unplaced = page.getByRole("region", { name: "1 note needs a new place" });
  await expect(unplaced).toContainText("No longer finds the section “Chorus”");
  await expect(unplaced).toContainText("Big finish, everyone.");
  await expect(
    page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: "Refrain 0 notes" }),
  ).toBeVisible();
  await unplaced.getByRole("link", { name: "Anchor again: Big finish, everyone." }).click();
  await expect(page.getByRole("heading", { name: "Edit the note" })).toBeVisible();
  await page.locator('select[name="anchor"]').selectOption({ label: "Refrain" });
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");
  await expect(page.getByRole("region", { name: /need.* a new place/ })).toHaveCount(0);
  await expect(page.locator("#section-2")).toContainText("Big finish, everyone.");
});

test("R-06.6 the MD hides the author's notes for the band", async ({ page, request }) => {
  const id = await createVersion(request, {
    title: `Tin Roof ${Date.now()}`,
    content: "## Verse\n> MD: Brushes only, says the author.\n1 | 4\n",
  });
  await signUpAndConfirm(page, unique("hide"), "Hal Hide");
  await page.goto(`/versions/${id}/notes`);
  const verse = page.locator("#section-1");
  const hide = page.getByRole("button", { name: "Hide the author's notes" });
  await expect(verse).toContainText("Brushes only, says the author.");
  await expect(hide).toHaveAttribute("aria-pressed", "false");

  await hide.click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("hidden for your band");
  await expect(verse).not.toContainText("Brushes only");
  await expect(hide).toHaveAttribute("aria-pressed", "true");

  await hide.click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("shown to your band");
  await expect(verse).toContainText("Brushes only, says the author.");
});
