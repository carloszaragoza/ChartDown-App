import { expect, type Page } from "@playwright/test";
import { createInvite } from "./admin";
import { latestLink } from "./mail";

// Shared steps of the end-to-end tests.
export const PASSWORD = "open-road-76";
export const unique = (label: string) =>
  `${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;

/** Step 1 of creating an account: the invite code and the email (R-01.7). */
export async function claim(page: Page, code: string, email: string) {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Invite code").fill(code);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function signUpAndConfirm(page: Page, email: string, name: string) {
  await claim(page, await createInvite(page.request), email);
  await expect(page.getByText(`Creating an account for ${email}`)).toBeVisible();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Password").fill(PASSWORD);
  const sentAfter = Date.now();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Check your email");
  await page.goto(await latestLink(page.request, email, sentAfter));
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Signs out and waits until the home page shows it, so the next step sees no session. */
export async function signOut(page: Page) {
  await openAccount(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
}

/** Opens the account menu of the top bar, where the profile and sign out are (T-706). */
export async function openAccount(page: Page) {
  await page.getByLabel(/^Account of /).click();
}

/** In the layer editor, chooses a section from the list on the left (T-707). */
export async function chooseSection(page: Page, label: string) {
  const name = new RegExp(`^${label.replace(/[()]/g, "\\$&")} \\d+ notes?$`);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name }).click();
  await expect(
    page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name }),
  ).toHaveAttribute("aria-current", "true");
}

/** How far below the song map the current section starts, in stand mode (F-001). */
export async function gapUnderSongMap(page: Page): Promise<number> {
  return page.evaluate(() => {
    const map = document.querySelector('nav[aria-label="Song form"]');
    const section = document.querySelector("main");
    if (!map || !section) return Number.POSITIVE_INFINITY;
    return section.getBoundingClientRect().top - map.getBoundingClientRect().bottom;
  });
}
