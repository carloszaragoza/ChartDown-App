import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createVersion } from "./admin";

const OPEN_ROAD = readFileSync(
  new URL("../../../packages/core/fixtures/open-road.chartdown", import.meta.url),
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
  await page.getByRole("combobox", { name: "Key" }).click();
  await page.getByRole("option", { name: "Key A", exact: true }).click();
  await expect(page).toHaveURL(/view=letters&key=A/);
  await expect(page.getByText("(written in G)")).toBeVisible();
  await expect(intro).toContainText("F#");

  await page.getByRole("link", { name: "Back to the written key, G" }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${id}\\?view=letters$`));
  await page.goto(`/versions/${id}`);
  await expect(style.getByRole("radio", { name: "Numbers" })).toBeChecked();
  await expect(page.getByText("(written in")).toHaveCount(0);
  expect(await saved()).toEqual(before);
});
