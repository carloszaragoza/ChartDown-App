import { expect, test } from "@playwright/test";
import { makeAdmin } from "./admin";
import { claim, signOut, signUpAndConfirm, unique, expectStatus } from "./flows";

test("R-01.7 the Admin creates and revokes invite codes; a revoked code stops working", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const name = `Admin ${stamp}`;
  await signUpAndConfirm(page, unique("admininvites"), name);
  await makeAdmin(request, name);
  await page.goto("/admin");
  await page.getByRole("main").getByRole("link", { name: "Open invite codes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Invite codes" })).toBeVisible();

  // A band code for ten people.
  const create = page.getByRole("form", { name: "Create a code" });
  // A single-use code always has one use; the field is locked.
  await expect(create.getByLabel("Uses")).toBeDisabled();
  await create.getByRole("combobox", { name: "Kind" }).click();
  await page.getByRole("option", { name: "Band code" }).click();
  await create.getByLabel("Uses").fill("10");
  await create.getByLabel("Who it is for").fill(`Cedar Band ${stamp}`);
  await create.getByRole("button", { name: "Create code" }).click();
  await expectStatus(page, "was created");
  const band = page.getByRole("row").filter({ hasText: `Cedar Band ${stamp}` });
  await expect(band).toContainText("Band code");
  await expect(band).toContainText("0 of 10");
  await expect(band).toContainText("Active");

  // A single-use code for Luis, then revoked.
  await page.goto("/admin/invites");
  await create.getByLabel("Who it is for").fill(`Luis ${stamp}`);
  await create.getByRole("button", { name: "Create code" }).click();
  const status = page.getByRole("main").getByRole("status").filter({ hasText: "was created" });
  await expect(status.first()).toBeVisible();
  const code =
    /[A-Z2-9]{4}-[A-Z2-9]{4}/.exec((await status.first().textContent()) ?? "")?.[0] ?? "";
  expect(code).not.toBe("");
  await page.getByRole("button", { name: `Revoke ${code}` }).click();
  await expectStatus(page, `Code ${code} was revoked`);
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText("Revoked");
  await expect(page.getByRole("button", { name: `Revoke ${code}` })).toHaveCount(0);

  await page.goto("/");
  await signOut(page);
  await claim(page, code, unique("luis"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "That invite code isn’t valid or has been used up.",
  );
});
