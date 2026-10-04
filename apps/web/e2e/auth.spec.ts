import { expect, test, type Page } from "@playwright/test";
import { latestLink } from "./mail";

const PASSWORD = "open-road-76";
const unique = (label: string) =>
  `${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;

async function signUpAndConfirm(page: Page, email: string, name: string) {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  const sentAfter = Date.now();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Check your email");
  await page.goto(await latestLink(page.request, email, sentAfter));
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("R-01.1 a person signs up, confirms their email, signs out and signs in again", async ({
  page,
}) => {
  const email = unique("ana");
  await signUpAndConfirm(page, email, "Ana Test");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await signIn(page, email, PASSWORD);
  await expect(page.getByText("Signed in as Ana Test")).toBeVisible();
});

test("R-01.1 an account cannot be used before its email is confirmed", async ({ page }) => {
  const email = unique("unconfirmed");
  await page.goto("/auth/sign-up");
  await page.getByLabel("Your name").fill("Not Yet");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Check your email");

  await signIn(page, email, PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Confirm your email first");
});

test("R-01.1 a wrong password is refused", async ({ page }) => {
  const email = unique("ben");
  await signUpAndConfirm(page, email, "Ben Test");
  await page.getByRole("button", { name: "Sign out" }).click();

  await signIn(page, email, "not-the-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("don’t match an account");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("R-01.1 a person recovers their account with a reset email", async ({ page }) => {
  const email = unique("carl");
  await signUpAndConfirm(page, email, "Carl Test");
  await page.getByRole("button", { name: "Sign out" }).click();

  await page.goto("/auth/forgot-password");
  await page.getByLabel("Email").fill(email);
  const sentAfter = Date.now();
  await page.getByRole("button", { name: "Send me a link" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("we sent it a link");

  await page.goto(await latestLink(page.request, email, sentAfter));
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password").fill("new-road-2026");
  await page.getByLabel("Repeat the password").fill("new-road-2026");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Your password was updated",
  );

  await page.getByRole("button", { name: "Sign out" }).click();
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
