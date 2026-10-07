import { expect, test } from "@playwright/test";
import { PASSWORD, openProfile, signIn, signOut, signUpAndConfirm, unique } from "./flows";

test("R-01.2 a person saves their name and the instruments they play", async ({ page }) => {
  await signUpAndConfirm(page, unique("profile"), "Ana Test");
  await openProfile(page);
  await page.getByLabel("Name").fill("Ana Keys");
  await page.getByLabel("Keys", { exact: true }).check();
  await page.getByLabel("Vocals", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Your profile was saved");

  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Ana Keys");
  await expect(page.getByLabel("Keys", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Vocals", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Drums", { exact: true })).not.toBeChecked();

  // Without the first save's message, so the next wait sees the second save's own message.
  await page.goto("/profile");
  await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
  await page.getByLabel("Vocals", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Your profile was saved");
  await page.reload();
  await expect(page.getByLabel("Vocals", { exact: true })).not.toBeChecked();
  await page.goto("/");
  await expect(page.getByText("Signed in as Ana Keys")).toBeVisible();
});

test("R-01.5 the chosen language persists across sessions", async ({ page, context }) => {
  const email = unique("idioma");
  await signUpAndConfirm(page, email, "Lucía Test");
  await openProfile(page);
  await page.getByLabel("Español").check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Tu perfil se guardó");

  // A new session in a browser that remembers nothing.
  await page.goto("/");
  await signOut(page);
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await context.clearCookies();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await signIn(page, email, PASSWORD);
  await expect(page.getByText("Sesión iniciada como Lucía Test")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("R-01.5 the language switcher saves to the profile when signed in", async ({
  page,
  context,
}) => {
  const email = unique("switch");
  await signUpAndConfirm(page, email, "Mateo Test");
  await page.getByRole("radio", { name: "Español" }).click();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

  await signOut(page);
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await context.clearCookies();
  await signIn(page, email, PASSWORD);
  await expect(page.getByText("Sesión iniciada como Mateo Test")).toBeVisible();
});

test("R-01.6 a person deletes their account, and it no longer signs in", async ({ page }) => {
  const email = unique("leaving");
  await signUpAndConfirm(page, email, "Leaving Test");
  await openProfile(page);

  await page.getByLabel("Type your email to confirm").fill("someone-else@example.test");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not match your account",
  );

  await page.getByLabel("Type your email to confirm").fill(email);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Your account was deleted",
  );
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await signIn(page, email, PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("don’t match an account");
});
