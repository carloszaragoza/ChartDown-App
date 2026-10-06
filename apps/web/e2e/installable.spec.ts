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
  // The logo kit's home-screen icons: iPhone, iPad Pro and iPad (Design Handoff 7).
  const touch = page.locator('link[rel="apple-touch-icon"]');
  await expect(touch).toHaveCount(3);
  for (const [href, sizes] of [
    ["/icons/apple-touch-icon.png", "180x180"],
    ["/icons/ipad-pro-167.png", "167x167"],
    ["/icons/ipad-152.png", "152x152"],
  ]) {
    await expect(page.locator(`link[rel="apple-touch-icon"][href="${href}"]`)).toHaveAttribute(
      "sizes",
      sizes as string,
    );
    expect((await request.get(href as string)).status(), href).toBe(200);
  }
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
