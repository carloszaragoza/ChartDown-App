import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";

const OPEN_ROAD = readFileSync(
  new URL("../../../fixtures/open-road.chartdown", import.meta.url),
  "utf8",
);
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

test("R-03.2 changing the key does not change the saved version", async ({ page, request }) => {
  const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
  const saved = async () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const response = await request.get(`${url()}/rest/v1/revisions`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      params: { select: "number,content", version_id: `eq.${id}` },
    });
    return response.json();
  };
  const before = await saved();

  await page.goto(`/versions/${id}`);
  const intro = page.locator("#section-1");
  await expect(page.getByText("Key G", { exact: true })).toBeVisible();
  await expect(intro).toContainText("6");

  const style = page.getByRole("radiogroup", { name: "Numbers or letters" });
  await style.getByRole("radio", { name: "Letters" }).click();
  await expect(page).toHaveURL(/view=letters/);
  await expect(intro).toContainText("E");
  // T-2807 the written key is "original", any other "transposed"; the header's token follows.
  await expect(page.getByRole("combobox", { name: "Key" })).toContainText("Key G · original");
  await page.getByRole("combobox", { name: "Key" }).click();
  await page.getByRole("option", { name: "Key A · transposed", exact: true }).click();
  await expect(page).toHaveURL(/view=letters&key=A/);
  await expect(page.getByRole("combobox", { name: "Key" })).toContainText("Key A · transposed");
  await expect(page.getByText("Key A", { exact: true })).toBeVisible();
  await expect(page.getByText("(written in G)")).toBeVisible();
  await expect(intro).toContainText("F#");

  await page.getByRole("button", { name: "Back to the written key, G" }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${id}\\?view=letters$`));
  await page.goto(`/versions/${id}`);
  await expect(style.getByRole("radio", { name: "Numbers" })).toBeChecked();
  await expect(page.getByText("(written in")).toHaveCount(0);
  expect(await saved()).toEqual(before);
});

test("F-011 the version page changes its view in place, asking the server nothing", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, { title: "Open Road", content: OPEN_ROAD });
  await page.goto(`/versions/${id}`);
  const intro = page.locator("#section-1");
  await expect(intro).toContainText("6");
  const asked: string[] = [];
  page.on("request", (sent) => {
    if (new URL(sent.url()).pathname.startsWith("/versions/")) asked.push(sent.url());
  });

  const style = page.getByRole("radiogroup", { name: "Numbers or letters" });
  await style.getByRole("radio", { name: "Letters" }).click();
  await expect(intro).toContainText("E");
  await page
    .getByRole("radiogroup", { name: "Beat slashes" })
    .getByRole("radio", { name: "Always" })
    .click();
  await expect(page).toHaveURL(/view=letters&beats=always/);
  await expect(page.getByRole("link", { name: "Stand mode" })).toHaveAttribute(
    "href",
    `/versions/${id}/stand?view=letters&beats=always`,
  );
  expect(asked).toEqual([]);
});

test("R-00.17 a section reused with a count shows how many times it plays", async ({
  page,
  request,
}) => {
  const id = await createVersion(request, {
    title: `Counted Copy ${Date.now()}`,
    content: "---\nchartdown: 0.8\n---\n## Chorus\n4 | 1 | 5 | 6m\n## Chorus 2\n@use Chorus 3x\n",
  });
  await page.goto(`/versions/${id}`);
  await expect(page.locator("#section-2")).toContainText("4 bars ×3");
  await expect(page.locator("#section-1")).not.toContainText("×");
});
