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
  await expectStatus(page, "Check your email");
  await page.goto(await latestLink(page.request, email, sentAfter));
  await expectSignedIn(page, name);
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

/** Stand mode's current section: the card at the top of the stack, marked Now (R-03.12). */
export function standNow(page: Page) {
  return page.locator('.cd-stand-card[data-state="current"]');
}

/** Waits until a section is the current one and has glided to the top of the stack (R-03.12). */
export async function expectStandNow(page: Page, name: string) {
  const card = standNow(page);
  await expect(card.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  await expect(async () => {
    const [cardBox, stackBox] = await Promise.all([
      card.boundingBox(),
      page.getByRole("main").boundingBox(),
    ]);
    expect(Math.abs((cardBox?.y ?? 0) - (stackBox?.y ?? 0)), name).toBeLessThan(16);
  }).toPass();
}

/** Waits for a status message on the page; Astryx banners carry their own live region. */
export async function expectStatus(page: Page, text: string) {
  await expect(
    page.getByRole("main").getByRole("status").filter({ hasText: text }).first(),
  ).toBeVisible();
}

/** On a version's page, opens the "…" menu and chooses one of its actions (T-2806). */
export async function moreAction(page: Page, name: string) {
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name }).click();
}

/**
 * On a version's page, adds it to one of the MD's sets, chosen by its label ("Band · Set"), in
 * one step: the page stays and a toast says so (R-05.2, T-2807).
 */
export async function addToSet(page: Page, label: string) {
  await page.getByRole("button", { name: "Add to set" }).click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
  await expect(page.getByText(`Added to ${label.split(" · ").pop()}`)).toBeVisible();
}

/** In the layer editor, the row of a section in the list on the left, with its note count. */
export function sectionRow(page: Page, label: string) {
  return page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: label, exact: true }) });
}

/** On a band's page, the MD sets a member's default instruments (R-04.3). */
export async function setInstruments(page: Page, name: string, instruments: string[]) {
  await page.getByRole("link", { name: `Default instruments of ${name}` }).click();
  const form = page.getByRole("region", { name: `Default instruments of ${name}` });
  for (const instrument of instruments) await form.getByLabel(instrument, { exact: true }).check();
  await form.getByRole("button", { name: "Save instruments" }).click();
}

/**
 * Fills the "Create a set" form and creates it (R-05.1). The date is given as YYYY-MM-DD and
 * typed the way the date field reads it.
 */
export async function createSet(
  page: Page,
  set: { name: string; type: string; date?: string; time?: string },
) {
  const form = page.getByRole("region", { name: "Create a set" });
  await form.getByLabel("Set name").fill(set.name);
  if (set.date) {
    const [year, month, day] = set.date.split("-");
    // The date field types or picks a date: a combobox that reads MM/DD/YYYY.
    const field = form.getByRole("combobox", { name: /^Date/ });
    await field.fill(`${month}/${day}/${year}`);
    await field.press("Tab");
  }
  if (set.time) {
    const field = form.getByRole("textbox", { name: /^Time/ });
    await field.fill(set.time);
    await field.press("Tab");
  }
  await form.getByRole("combobox", { name: /^Type/ }).click();
  await page.getByRole("option", { name: set.type, exact: true }).click();
  await form.getByRole("button", { name: "Create set" }).click();
}

/**
 * Writes a chart in the editor and waits until Save takes it. Right after a page opens, React
 * may not have taken over the text area yet, and typing then is lost; this types again.
 */
export async function writeChart(page: Page, text: string) {
  const field = page.getByLabel("Chart (ChartDown)");
  const save = page.getByRole("button", { name: "Save" });
  await expect(async () => {
    await field.fill(text);
    await expect(save).toBeEnabled({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/** On Edit set, chooses the key a song is played in; choosing saves it (R-05.4). */
export async function setKey(page: Page, title: string, key: string) {
  await page.getByRole("combobox", { name: `Key of ${title}` }).click();
  await page.getByRole("option", { name: key, exact: true }).click();
}

/** The person is signed in: their name at the foot of the side navigation (T-1301, T-1308). */
export async function expectSignedIn(page: Page, name: string) {
  // The person's link to their profile, in any language.
  await expect(page.locator('a[href="/profile"]').filter({ hasText: name }).first()).toBeVisible();
}

/** Puts a musician on an instrument in Edit set's lineup, from their instruments menu (T-2407). */
export async function chooseInstrument(page: Page, name: string, instrument: string) {
  await page.getByRole("combobox", { name: `Instruments for ${name}` }).click();
  await page.getByRole("option", { name: instrument, exact: true }).click();
  await page.keyboard.press("Escape");
}
