import { expect, test } from "@playwright/test";
import { createInvite, waitlistEntries } from "./admin";
import { claim, PASSWORD, signIn, signOut, signUpAndConfirm, unique, expectStatus } from "./flows";
import { latestLink } from "./mail";

test("R-01.1 a person signs up, confirms their email, signs out and signs in again", async ({
  page,
}) => {
  const email = unique("ana");
  await signUpAndConfirm(page, email, "Ana Test");

  await signOut(page);

  await signIn(page, email, PASSWORD);
  await expect(page.getByText("Signed in as Ana Test")).toBeVisible();
});

test("R-01.1 an account cannot be used before its email is confirmed", async ({ page }) => {
  const email = unique("unconfirmed");
  await claim(page, await createInvite(page.request), email);
  await page.getByLabel("Your name").fill("Not Yet");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expectStatus(page, "Check your email");

  await signIn(page, email, PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Confirm your email first");
});

test("R-01.1 a wrong password is refused", async ({ page }) => {
  const email = unique("ben");
  await signUpAndConfirm(page, email, "Ben Test");
  await signOut(page);

  await signIn(page, email, "not-the-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("don’t match an account");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("R-01.1 a person recovers their account with a reset email", async ({ page }) => {
  const email = unique("carl");
  await signUpAndConfirm(page, email, "Carl Test");
  await signOut(page);

  await page.goto("/auth/forgot-password");
  await page.getByLabel("Email").fill(email);
  const sentAfter = Date.now();
  await page.getByRole("button", { name: "Send me a link" }).click();
  await expectStatus(page, "we sent it a link");

  await page.goto(await latestLink(page.request, email, sentAfter));
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password").fill("new-road-2026");
  await page.getByLabel("Repeat the password").fill("new-road-2026");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expectStatus(page, "Your password was updated");

  await signOut(page);
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await signIn(page, email, "new-road-2026");
  await expect(page.getByText("Signed in as Carl Test")).toBeVisible();
});

test("R-01.1 the reset form asks for the same password twice", async ({ page }) => {
  const email = unique("dora");
  await signUpAndConfirm(page, email, "Dora Test");
  await page.goto("/auth/reset-password");
  await page.getByLabel("New password").fill("first-choice-1");
  await page.getByLabel("Repeat the password").fill("second-choice-2");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("not the same");
});

test("R-01.7 no code, no account", async ({ page }) => {
  await page.goto("/auth/sign-up");
  await expect(page.getByLabel("Password")).toHaveCount(0);
  await claim(page, "ZZZZ-ZZZZ", unique("nocode"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "isn’t valid or has been used up",
  );
  await expect(page.getByLabel("Password")).toHaveCount(0);
});

test("R-01.7 a single-use code creates one account only", async ({ page }) => {
  const code = await createInvite(page.request);
  await claim(page, code, unique("first"));
  await page.getByLabel("Your name").fill("First");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expectStatus(page, "Check your email");

  await claim(page, code, unique("second"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "isn’t valid or has been used up",
  );
});

test("R-01.8 without a code, the waitlist stores the email", async ({ page }) => {
  const email = unique("fan");
  await page.goto("/auth/sign-up");
  await page.getByRole("link", { name: "Join the waitlist" }).click();
  // The sign-up page has an Email field too: fill the waitlist's own.
  await expect(page).toHaveURL(/\/auth\/waitlist/);
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expectStatus(page, "We’ll write to you");
  expect(await waitlistEntries(page.request, email)).toEqual([{ email, language: "en" }]);
});
