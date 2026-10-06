import { expect, test } from "@playwright/test";

test("T-901 the app is installable: manifest, icons and a service worker", async ({
  page,
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "ChartDown", display: "standalone" });
  for (const icon of manifest.icons as { src: string }[])
    expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  expect((await request.get("/icons/apple-touch-icon.png")).status()).toBe(200);

  await page.goto("/catalog");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
  // The service worker takes charge of the page.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
});

test("T-901 without a connection, a page shows the offline page", async ({ page, context }) => {
  await page.goto("/catalog");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/songs/00000000-0000-0000-0000-000000000000").catch(() => {});
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await context.setOffline(false);
});
