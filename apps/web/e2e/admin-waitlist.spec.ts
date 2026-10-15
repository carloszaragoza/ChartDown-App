import { expect, test } from "@playwright/test";
import { makeAdmin } from "./admin";
import { claim, signOut, signUpAndConfirm, unique, expectStatus } from "./flows";

test("R-07.5 a visitor joins the waitlist, the Admin invites them and the code creates their account", async ({
  page,
  request,
}) => {
  // A visitor leaves their email.
  const fan = unique("waiting");
  await page.goto("/auth/waitlist");
  await page.getByLabel("Email").fill(fan);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expectStatus(page, "We’ll write to you");

  // The Admin finds them waiting and invites them.
  const name = `Admin ${Date.now()}`;
  await signUpAndConfirm(page, unique("adminwaitlist"), name);
  await makeAdmin(request, name);
  await page.goto("/admin");
  await page.getByRole("link", { name: "Waitlist", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Waitlist" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: fan })).toBeVisible();
  await page.getByRole("button", { name: `Invite ${fan}` }).click();
  await expectStatus(page, "was created");
  const code =
    /[A-Z2-9]{4}-[A-Z2-9]{4}/.exec(
      (await page.getByRole("main").getByRole("status").first().textContent()) ?? "",
    )?.[0] ?? "";
  expect(code).not.toBe("");
  await expect(page.getByRole("button", { name: `Invite ${fan}` })).toHaveCount(0);

  // They moved to Invited, with their code; the code is noted with their email.
  await page.getByRole("link", { name: /^Invited/ }).click();
  await expect(page.getByRole("row").filter({ hasText: fan })).toContainText(code);
  await page.goto("/admin/invites");
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(fan);

  // The code creates their account.
  await page.goto("/");
  await signOut(page);
  await claim(page, code, fan);
  await expect(page.getByText(`Creating an account for ${fan}`)).toBeVisible();
});
