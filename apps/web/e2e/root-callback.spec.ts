import { expect, test } from "@playwright/test";

test("R-01.1 a sign-in sent back to the root finishes at /auth/callback and says why it failed", async ({
  page,
}) => {
  // What Supabase Auth sends when the sign-up hook refused a provider sign-in, if it fell back
  // to the Site URL instead of /auth/callback.
  await page.goto(
    "/?error=access_denied&error_code=unexpected_failure&error_description=invite_required",
  );
  await expect(page).toHaveURL(/\/auth\/sign-in\?error=invite_required$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "You need an invite to create an account.",
  );
});

test("R-01.1 a code that is no longer valid at the root ends on sign-in, not on a blank page", async ({
  page,
}) => {
  await page.goto("/?code=00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/auth\/sign-in\?error=/);
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
});
