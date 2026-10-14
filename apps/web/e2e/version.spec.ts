import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";
import { PASSWORD, signOut, signUpAndConfirm, unique } from "./flows";

const OPEN_ROAD = readFileSync(
  new URL("../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);

test("R-01.4 a visitor reads a public version without an account", async ({ page, request }) => {
  const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
  await page.goto(`/versions/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Open Road" })).toBeVisible();
  await expect(page.getByText("Arrangement by ChartDown")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Last Chorus" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Song form" }).getByRole("link")).toHaveCount(
    7,
  );
});

test("R-01.4 forking asks the visitor to sign in, then comes back to the version", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
  const email = unique("forker");
  await signUpAndConfirm(page, email, "Fork Test");
  await signOut(page);

  await page.goto(`/versions/${id}`);
  await page.getByRole("link", { name: "Fork", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(new RegExp(`/versions/${id}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Open Road" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Fork", exact: true })).toHaveCount(0);
});

test("R-02.5 a private version is not found for a visitor", async ({ page, request }) => {
  const id = await createVersion(request, {
    title: "Private Song",
    content: "## Verse\n1 | 4",
    visibility: "private",
  });
  const response = await page.goto(`/versions/${id}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Private Song")).toHaveCount(0);
});

test("R-01.4 a version that does not exist is not found", async ({ page }) => {
  const response = await page.goto("/versions/00000000-0000-0000-0000-000000000000");
  expect(response?.status()).toBe(404);
});
