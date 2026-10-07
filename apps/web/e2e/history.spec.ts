import { expect, test } from "@playwright/test";
import { addRevisions } from "./admin";
import { signOut, signUpAndConfirm, unique, expectStatus } from "./flows";

// Each revision's chart names its own section, so the page shows which one it is.
const chart = (number: number) => `## Take ${number}\n1 | 4 | 5 | 1\n`;

test("R-02.8 restoring revision 3 creates a new revision", async ({ page, request }) => {
  const title = `Cedar Steps ${Date.now()}`;
  await signUpAndConfirm(page, unique("history"), "Dana History");

  // Revision 1 through the app, revisions 2 to 5 as later saves.
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Create a new song" }).click();
  await page.getByLabel("Chart (ChartDown)").fill(chart(1));
  await page.getByLabel("Own arrangement").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;
  const id = address.split("/").pop() ?? "";
  await addRevisions(request, id, [chart(2), chart(3), chart(4), chart(5)]);

  await page.goto(address);
  await expect(page.getByRole("heading", { name: "Take 5" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("list", { name: "History" }).getByRole("listitem")).toHaveCount(5);

  await page.getByRole("link", { name: "Revision 3", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Take 3" })).toBeVisible();
  await expect(page.getByText("an earlier revision, read-only")).toBeVisible();
  await page.getByRole("button", { name: "Restore this revision" }).click();

  await expectStatus(page, "Revision 3 was restored. It is now revision 6");
  const newest = page.getByRole("list", { name: "History" }).getByRole("listitem").first();
  await expect(newest).toContainText("Revision 6");
  await expect(newest).toContainText("Current");
  await expect(newest).toContainText("restored from revision 3");
  await expect(page.getByRole("list", { name: "History" }).getByRole("listitem")).toHaveCount(6);

  await page.goto(address);
  await expect(page.getByRole("heading", { name: "Take 3" })).toBeVisible();

  // The current revision offers no restore.
  await page.goto(`${address}/revisions/6`);
  await expect(page.getByText("the current revision")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore this revision" })).toHaveCount(0);

  // Only the owner sees the history.
  await page.goto("/");
  await signOut(page);
  await page.goto(address);
  await expect(page.getByRole("heading", { name: "Take 3" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "History" })).toHaveCount(0);
  expect((await page.goto(`${address}/history`))?.status()).toBe(404);
  expect((await page.goto(`${address}/revisions/3`))?.status()).toBe(404);
});
