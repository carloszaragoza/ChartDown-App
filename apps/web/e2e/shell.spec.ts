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
