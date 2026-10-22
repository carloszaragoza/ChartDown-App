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

test.describe("on an iPad", () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

  test("T-2833 a page that is read has the side navigation's size: actions, metronome and song form at 44 px", async ({
    page,
    request,
  }) => {
    const id = await createVersion(request, {
      title: `Low Tide ${Date.now()}`,
      content: "---\ntempo: 80\n---\n## Intro\n1 | 4\n\n## Verse\n1 | 4 | 5 | 1\n",
    });
    await page.goto(`/versions/${id}`);
    const main = page.getByRole("main");
    const controls = [
      main.getByRole("link", { name: "Stand mode" }),
      main.getByRole("group", { name: "Metronome" }).getByRole("button").first(),
      main.getByRole("button", { name: "View options" }),
      ...(await page.getByRole("navigation", { name: "Song form" }).getByRole("link").all()),
    ];
    for (const control of controls) {
      const box = await control.boundingBox();
      const name = await control.getAttribute("aria-label");
      expect(Math.round(box?.height ?? 0), name ?? "").toBe(44);
      // A one-letter section ("I") is still a whole touch target.
      expect(Math.round(box?.width ?? 0), name ?? "").toBeGreaterThanOrEqual(44);
    }
  });
});
