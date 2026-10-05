import { expect, test } from "@playwright/test";
import { createVersion } from "./admin";
import { PASSWORD, signIn, signOut, signUpAndConfirm, unique } from "./flows";

const CHART = "---\nkey: G\n---\n## Verse\n1 | 4 | 5 | 1\n";
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

test("R-05.4 the set key does not change the version for others", async ({ page, request }) => {
  const stamp = Date.now();
  const band = `Pine Band ${stamp}`;
  const set = `Friday ${stamp}`;
  const title = `Low Tide ${stamp}`;
  const ana = unique("keymd");
  const ben = unique("keyplayer");
  const id = await createVersion(request, { title, content: CHART });
  const saved = async () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const response = await request.get(`${url()}/rest/v1/revisions`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      params: { select: "number,content", version_id: `eq.${id}` },
    });
    return response.json();
  };
  const before = await saved();

  // Ana's band with Ben, and a set with the song.
  await signUpAndConfirm(page, ana, "Ana Keys");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(ben);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, ben, "Ben Bass");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Welcome to the band.");
  await page.goto("/");
  await signOut(page);

  await signIn(page, ana, PASSWORD);
  await expect(page.getByText("Signed in as Ana Keys")).toBeVisible();
  await page.goto("/bands");
  await page.getByRole("link", { name: band }).click();
  await page.getByRole("link", { name: "Sets", exact: true }).click();
  await page.getByLabel("Set name").fill(set);
  await page.getByLabel("Type").selectOption({ label: "Rehearsal" });
  await page.getByRole("button", { name: "Create set" }).click();
  // Wait for the new set's page before keeping its address.
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  await page.goto(`/versions/${id}`);
  await page.getByLabel("Add to a set").selectOption({ label: `${band} · ${set}` });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("added at the end");

  // The key for this set, and the set's own lineup (R-05.3, R-05.4).
  await expect(page.getByText("This set uses the band's default instruments.")).toBeVisible();
  await page.getByLabel(`Key of ${title}`).selectOption("A");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The key was saved.");
  await expect(page.getByText("in A (written in G)")).toBeVisible();
  await page.getByRole("group", { name: "Ben Bass" }).getByLabel("Bass", { exact: true }).check();
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("The lineup was saved.");
  await expect(page.getByText("This set has its own lineup.")).toBeVisible();
  await page.goto("/");
  await signOut(page);

  // Ben reads the set and plays the song in A, as letters.
  await signIn(page, ben, PASSWORD);
  await expect(page.getByText("Signed in as Ben Bass")).toBeVisible();
  await page.goto(setAddress);
  await expect(page.getByRole("region", { name: "Lineup" })).toContainText("Ben Bass");
  await expect(page.getByRole("region", { name: "Lineup" })).toContainText("Bass");
  await expect(page.getByLabel(`Key of ${title}`)).toHaveCount(0);
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByText("Song 1 of 1")).toBeVisible();
  await expect(page.getByText("(written in G)")).toBeVisible();
  await page.getByRole("link", { name: "Letters" }).click();
  await expect(page.locator(".cd-chord").first()).toHaveText("A");

  // Everyone else still sees the version as written, and it never changed.
  await page.goto(`/versions/${id}`);
  await expect(page.getByText("(written in")).toHaveCount(0);
  await page.getByRole("link", { name: "Letters" }).click();
  await expect(page.locator(".cd-chord").first()).toHaveText("G");
  expect(await saved()).toEqual(before);
});
