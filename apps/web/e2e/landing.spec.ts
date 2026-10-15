import { expect, test } from "@playwright/test";
import { waitlistEntries } from "./admin";
import { unique } from "./flows";

test("R-01.8 a visitor joins the waitlist from the hero and from the final panel, with a role", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every night.");

  const first = unique("hero");
  const hero = page.locator("#top");
  await hero.getByLabel("Get early access").fill(first);
  await hero.getByRole("button", { name: "Save my spot" }).click();
  await expect(hero.getByRole("status")).toContainText("You're on the list.");
  await expect(hero.getByRole("status")).toBeFocused();

  const second = unique("final");
  await page.getByRole("banner").getByRole("link", { name: "Join the waitlist" }).click();
  await expect(page).toHaveURL(/#waitlist$/);
  const panel = page.locator("#waitlist");
  await panel.getByText("Teacher").click();
  await panel.getByLabel("Email").fill(second);
  await panel.getByRole("button", { name: "Save my spot" }).click();
  await expect(panel.getByRole("status")).toContainText("You're on the list.");

  const read = async (email: string) => {
    const response = await request.get(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"}/rest/v1/waitlist`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
        },
        params: { select: "email,role,source", email: `eq.${email}` },
      },
    );
    return response.json();
  };
  expect(await read(first)).toEqual([{ email: first, role: null, source: "hero" }]);
  expect(await read(second)).toEqual([{ email: second, role: "teacher", source: "final_cta" }]);
  expect(await waitlistEntries(page.request, second)).toEqual([{ email: second, language: "en" }]);
});

test("R-01.8 a wrong email is said under the field, and what was typed stays", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#top");
  await hero.getByLabel("Get early access").fill("not-an-email");
  await hero.getByRole("button", { name: "Save my spot" }).click();
  await expect(hero.getByRole("alert")).toHaveText("Please enter a valid email.");
  await expect(hero.getByLabel("Get early access")).toHaveValue("not-an-email");
});

test("R-01.7 the landing page leads to sign-in and to the invite code", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "I have an invite code" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test("T-1310 the landing page works on a phone, with no sideways scrolling and 44 px targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  // A phone keeps the way in: the catalog and Sign in stay in the top bar.
  await expect(page.getByRole("banner").getByRole("link", { name: "Catalog" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
  for (const target of [
    page.getByRole("banner").getByRole("link", { name: "Join the waitlist" }),
    page.locator("#top").getByRole("button", { name: "Save my spot" }),
  ]) {
    expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("T-1310 with reduced motion every section shows its final state at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[aria-hidden='true']").first()).toBeAttached();
  // No curtain over the page, and the headline is in place at once.
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();
  await page.locator("#features").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
  const moving = await page.evaluate(
    () => document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
  expect(moving).toBe(0);
});
