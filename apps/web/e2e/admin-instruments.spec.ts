import { expect, test } from "@playwright/test";
import { makeAdmin } from "./admin";
import { signUpAndConfirm, unique } from "./flows";

test("R-07.3 the Admin adds, renames and deactivates an instrument, never deleting it", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const slug = `cello-${stamp}`;
  const name = `Admin ${stamp}`;

  // Not an admin yet: the area does not exist for them.
  await signUpAndConfirm(page, unique("admin"), name);
  await expect(page.getByRole("link", { name: "Overview" })).toHaveCount(0);
  const hidden = await page.goto("/admin/instruments");
  expect(hidden?.status()).toBe(404);

  await makeAdmin(request, name);
  await page.goto("/");
  await page.getByRole("link", { name: "Overview" }).click();
  await page.getByRole("main").getByRole("link", { name: "Instruments" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Instruments" })).toBeVisible();

  const add = page.getByRole("form", { name: "Add an instrument" });
  await add.getByLabel("Id in charts").fill(slug);
  await add.getByLabel("Name in English").fill(`Cello ${stamp}`);
  await add.getByLabel("Name in Spanish").fill(`Violonchelo ${stamp}`);
  await add.getByLabel("Other names in charts, separated by commas").fill("VC");
  await add.getByRole("button", { name: "Add instrument" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(`${slug} was saved.`);

  // The same id twice is refused.
  await add.getByLabel("Id in charts").fill(slug);
  await add.getByLabel("Name in English").fill("Again");
  await add.getByLabel("Name in Spanish").fill("Otra vez");
  await add.getByRole("button", { name: "Add instrument" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("already in the catalog");

  const edit = page.getByRole("form", { name: `Edit Cello ${stamp}` });
  await edit.getByLabel("Name in Spanish").fill(`Chelo ${stamp}`);
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(`${slug} was saved.`);
  await expect(
    page.getByRole("form", { name: `Edit Cello ${stamp}` }).getByLabel("Name in Spanish"),
  ).toHaveValue(`Chelo ${stamp}`);

  await page.getByRole("button", { name: `Deactivate Cello ${stamp}` }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("no longer offered");
  await expect(page.getByRole("button", { name: `Reactivate Cello ${stamp}` })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete/ })).toHaveCount(0);

  // A deactivated instrument is not offered on a profile (R-07.3).
  await page.goto("/profile");
  await expect(page.getByLabel(`Cello ${stamp}`)).toHaveCount(0);
});
