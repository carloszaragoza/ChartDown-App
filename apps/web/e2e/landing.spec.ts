import { expect, test } from "@playwright/test";
import { waitlistEntries } from "./admin";
import { unique } from "./flows";

test("R-01.8 a visitor joins the waitlist from the landing page", async ({ page }) => {
  const email = unique("landing");
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "One song for the whole band. Cues for every player.",
    }),
  ).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Request an invite" }).click();
  await expect(page).toHaveURL(/#invite$/);
  await page.getByRole("region", { name: "Join the beta" }).getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(
    page.getByRole("region", { name: "Join the beta" }).getByRole("status"),
  ).toContainText("we will write when there is a place for you");
  expect(await waitlistEntries(page.request, email)).toEqual([{ email, language: "en" }]);
});

test("R-01.7 the landing page leads to sign-in and to the invite code", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "I have an invite code" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test("T-1201 the landing page works on a phone, with no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const name of ["Request an invite", "Join the waitlist"]) {
    const box = await page
      .getByRole(name === "Join the waitlist" ? "button" : "link", { name })
      .first()
      .boundingBox();
    expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
  }
});
