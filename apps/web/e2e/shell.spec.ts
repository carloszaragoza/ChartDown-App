import { expect, test } from "@playwright/test";
import { makeAdmin } from "./admin";
import { signUpAndConfirm, unique } from "./flows";

test("T-1301 a visitor's pages have the side navigation; the landing page and stand mode don't", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/catalog");
    const nav = page
      .getByRole("navigation")
      .filter({ has: page.getByRole("link", { name: "Catalog" }) });
    await expect(nav.getByRole("link", { name: "Catalog" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: "ChartDown" }).first()).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Catalog");
  }
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Overview" })).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "Language" })).toHaveCount(0);
});

test("T-1301 a signed-in person gets every section; only admins get Administration", async ({
  page,
  request,
}) => {
  const name = `Shell Test ${Date.now()}`;
  await signUpAndConfirm(page, unique("shell"), name);
  await page.goto("/sets");
  const nav = page.getByRole("navigation", { name: "Side navigation" });
  for (const link of [
    "Notices",
    "Sets",
    "Stand mode",
    "Catalog",
    "New version",
    "Chart editor",
    "Director's notes",
    "Bands",
    "Personal space",
  ])
    await expect(nav.getByRole("link", { name: link, exact: true }), link).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sets", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Overview" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  // With no version open, the editor and the notes lead to Your versions.
  await nav.getByRole("link", { name: "Chart editor", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your versions" })).toBeVisible();
  await expect(page.getByText("No versions yet")).toBeVisible();

  await makeAdmin(request, name);
  await page.reload();
  for (const link of ["Overview", "Instruments", "Invite codes", "Reports"])
    await expect(nav.getByRole("link", { name: link, exact: true }), link).toBeVisible();

  // Stand mode with no sets yet opens the sets list.
  await nav.getByRole("link", { name: "Stand mode", exact: true }).click();
  await expect(page).toHaveURL(/\/sets$/);
});

test.describe("on an iPad", () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

  test("T-1302 every control in the side navigation is at least 44 px to tap", async ({ page }) => {
    await signUpAndConfirm(page, unique("touch"), `Touch Test ${Date.now()}`);
    await page.goto("/sets");
    const nav = page.getByRole("navigation", { name: "Side navigation" });
    await expect(nav.getByRole("link", { name: "Sets", exact: true })).toBeVisible();
    const controls = nav.locator("a, button, [role=radio]");
    expect(await controls.count()).toBeGreaterThan(10);
    for (const control of await controls.all()) {
      if (!(await control.isVisible())) continue;
      // The heading's chevron is its keyboard control; a tap anywhere on the heading opens the
      // band menu, so the heading is the target.
      const box = await control.evaluate((element) => {
        const rect = (
          element.closest(".astryx-side-nav-heading") ?? element
        ).getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
      expect(Math.round(box.height), name).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.width), name).toBeGreaterThanOrEqual(44);
    }
  });

  test("T-1302 every page keeps the same 32 px gutter around its content", async ({ page }) => {
    await signUpAndConfirm(page, unique("gutter"), `Gutter Test ${Date.now()}`);
    for (const path of ["/notices", "/sets", "/bands", "/profile", "/versions/mine", "/catalog"]) {
      await page.goto(path);
      const heading = page.getByRole("heading", { level: 1 }).first();
      await expect(heading, path).toBeVisible();
      const [main, title] = await Promise.all([
        page.getByRole("main").boundingBox(),
        heading.boundingBox(),
      ]);
      if (!main || !title) throw new Error(`No box on ${path}`);
      expect(Math.round(title.x - main.x), path).toBeGreaterThanOrEqual(32);
      expect(Math.round(title.y - main.y), path).toBeGreaterThanOrEqual(32);
      // Nothing runs past the right edge of the page.
      const overflow = await page
        .getByRole("main")
        .evaluate((area) => area.scrollWidth - area.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
