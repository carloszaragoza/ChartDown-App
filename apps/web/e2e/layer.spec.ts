import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { signOut, signUpAndConfirm, unique } from "./flows";

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
  await page.getByLabel("Section").selectOption({ label: "Chorus (2nd)" });
  await page.getByLabel("Bar (optional)").fill("2");
  await page.getByLabel("Keys", { exact: true }).check();
  await page.getByLabel("Note", { exact: true }).fill("Pad swell into the last bar.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");

  const secondChorus = page.locator("#section-3");
  await expect(secondChorus).toContainText("Bar 2 · Pad swell into the last bar.");
  await expect(secondChorus).toContainText("Keys");
  await expect(page.locator("#section-2")).not.toContainText("Pad swell");
  await expect(page.getByText("Chorus (2nd) · Bar 2 · Keys")).toBeVisible();

  // Editing: a note for everyone in the Verse.
  await page.getByRole("link", { name: "Edit the note: Pad swell into the last bar." }).click();
  await page.getByLabel("Section").selectOption({ label: "Verse" });
  await page.getByLabel("Bar (optional)").fill("");
  await page.getByLabel("Keys", { exact: true }).uncheck();
  await page.getByLabel("Note", { exact: true }).fill("Everyone soft until the chorus.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was saved.");
  await expect(page.locator("#section-1")).toContainText("Everyone soft until the chorus.");
  await expect(page.getByText("Verse · Everyone")).toBeVisible();

  // The public version is untouched, and outside a set it shows no layer (R-06.5).
  expect(await saved()).toEqual(before);
  await page.goto(`/versions/${id}`);
  await expect(page.getByText("Everyone soft until the chorus.")).toHaveCount(0);

  // Deleting.
  await page.goto(`/versions/${id}/notes`);
  await page
    .getByRole("button", { name: "Delete the note: Everyone soft until the chorus." })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The note was deleted.");
  await expect(page.getByText("No notes yet")).toBeVisible();

  // Nobody else reaches the notes page.
  await page.goto("/");
  await signOut(page);
  expect((await page.goto(`/versions/${id}/notes`))?.status()).toBe(404);
});
