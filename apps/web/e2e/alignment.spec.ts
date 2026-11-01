import { expect, test, type Page } from "@playwright/test";
import { createVersion, makeAdmin, songOf } from "./admin";
import { createSet, signUpAndConfirm, unique } from "./flows";

/** A row's text starts on the line of the page's title, never in the page's gutter. */
async function expectOnTitleLine(page: Page, text: string) {
  const title = await page.getByRole("heading", { level: 1 }).first().boundingBox();
  const row = await page.getByRole("main").getByText(text, { exact: true }).first().boundingBox();
  expect(title, "the page's title").not.toBeNull();
  expect(row, text).not.toBeNull();
  expect(Math.abs((row?.x ?? 0) - (title?.x ?? 0)), text).toBeLessThan(1.5);
}

test("R-03.9 T-3045 the catalog's rows start on the title's line", async ({ page, request }) => {
  const stamp = Date.now();
  const open = await createVersion(request, {
    title: `Aligned A ${stamp}`,
    content: "## Verse\n1 | 4 |\n",
  });
  await createVersion(request, { title: `Aligned B ${stamp}`, content: "## Verse\n1 | 5 |\n" });
  // A is open in its card, so B is one of the rows under it.
  await page.goto(`/catalog?q=${stamp}&song=${await songOf(request, open)}`);
  await expectOnTitleLine(page, `Aligned B ${stamp}`);
});

test("R-03.9 T-3045 New version, Sets, Bands, My versions and Invite codes keep to the content's lines", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `Lined Up ${stamp}`;
  const name = `Aligner ${stamp}`;
  const version = await createVersion(request, { title, content: "## Verse\n1 | 4 |\n" });
  await signUpAndConfirm(page, unique("aligner"), name);

  await page.goto(`/versions/new?q=${encodeURIComponent(title)}`);
  await expectOnTitleLine(page, title);

  await page.goto("/bands");
  await expectOnTitleLine(page, "Personal space");

  await page.getByRole("main").getByRole("link", { name: "Sets" }).first().click();
  await createSet(page, { name: `Sunday ${stamp}`, type: "Rehearsal" });
  await page.goto("/sets");
  await expectOnTitleLine(page, `Sunday ${stamp}`);

  await page.goto(`/versions/${version}`);
  await page.getByRole("button", { name: "Fork" }).click();
  await page.waitForURL(
    (url) => /^\/versions\/[0-9a-f-]{36}$/.test(url.pathname) && !url.pathname.includes(version),
  );
  await page.goto("/versions/mine");
  await expectOnTitleLine(page, title);

  // A table stays inside its card: its rows never reach into the page's gutter.
  await makeAdmin(request, name);
  await page.goto("/admin/invites");
  const card = await page.locator('section[aria-labelledby="codes-title"]').boundingBox();
  const rows = page.getByRole("row");
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) {
    const box = await row.boundingBox();
    expect(box?.x ?? 0).toBeGreaterThanOrEqual((card?.x ?? 0) - 0.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (card?.x ?? 0) + (card?.width ?? 0) + 0.5,
    );
  }
});
