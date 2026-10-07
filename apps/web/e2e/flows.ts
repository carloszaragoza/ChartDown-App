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
  await page.getByRole("checkbox", { name: /^I accept the Terms of Use/ }).check();
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

/** Signs out from the side navigation and waits for the landing page, so the next step sees no session. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: /^(Sign out|Cerrar sesión)$/ }).click();
  await expect(
    page.getByRole("link", { name: /^(Sign in|Iniciar sesión)$/ }).first(),
  ).toBeVisible();
}

/** Opens the profile from the person's link at the foot of the side navigation (T-1301). */
export async function openProfile(page: Page) {
  await page.locator('a[href="/profile"]').first().click();
  await expect(page).toHaveURL(/\/profile$/);
}

/** In the layer editor, chooses a section from the list on the left (T-707). */
export async function chooseSection(page: Page, label: string) {
  const sections = page.getByRole("navigation", { name: "Sections" });
  await sections.getByRole("link", { name: label, exact: true }).click();
  // The chosen section is the selected row of the list (Design Handoff 2.0 screen 07).
  await expect(sections.locator('[aria-current="true"]')).toContainText(label);
}

/** How far below the song map the current section starts, in stand mode (F-001). */
export async function gapUnderSongMap(page: Page): Promise<number> {
  // After a client-side navigation into stand mode, wait until both are in place.
  await page.locator('nav[aria-label="Song form"]').waitFor();
  await page.locator("main").waitFor();
  return page.evaluate(() => {
    const map = document.querySelector('nav[aria-label="Song form"]');
    const section = document.querySelector("main");
    if (!map || !section) return Number.POSITIVE_INFINITY;
    return section.getBoundingClientRect().top - map.getBoundingClientRect().bottom;
  });
}

/** Waits for a status message on the page; Astryx banners carry their own live region. */
export async function expectStatus(page: Page, text: string) {
  await expect(
    page.getByRole("main").getByRole("status").filter({ hasText: text }).first(),
  ).toBeVisible();
}

/** On a version's page, adds it to one of the MD's sets, chosen by its label (R-05.2). */
export async function addToSet(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Add to a set" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
}

/** In the layer editor, the row of a section in the list on the left, with its note count. */
export function sectionRow(page: Page, label: string) {
  return page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: label, exact: true }) });
}
