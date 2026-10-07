import { expect, test } from "@playwright/test";
import { addToSet, createSet, expectStatus, signUpAndConfirm, unique } from "./flows";

test("T-1308 Home grows from the new user's first steps to the director's view of their work", async ({
  page,
}) => {
  const stamp = Date.now();
  const band = `Home Band ${stamp}`;
  const title = `Willow Road ${stamp}`;
  const set = `Today ${stamp}`;
  await signUpAndConfirm(page, unique("home"), "Hana Home");

  // A new person: four steps to get started, none done.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome to ChartDown, Hana" }),
  ).toBeVisible();
  const steps = page.getByRole("region", { name: "Get started" });
  await expect(steps).toContainText("0 of 4 done");
  await expect(steps.getByRole("link", { name: "Go to bands" })).toBeVisible();

  // She starts a band, publishes a version, and her band plays it today.
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await expect(page.getByRole("heading", { level: 1, name: band })).toBeVisible();
  await page.goto("/versions/new?song=new&q=" + encodeURIComponent(title));
  await page.getByLabel("Chart (ChartDown)").fill("## Verse\n1 | 4 | 5 | 1\n");
  await page.getByLabel("Own arrangement").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const version = new URL(page.url()).pathname;
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, {
    name: set,
    type: "Service",
    date: new Date().toISOString().slice(0, 10),
  });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  await page.goto(version);
  await addToSet(page, `${band} · ${set}`);
  await expectStatus(page, "added at the end");

  // Now Home is a music director's: the set next up, and how her public version is used.
  await page.goto("/");
  await expect(page.getByText(`Music director of ${band}`)).toBeVisible();
  const nextUp = page.getByRole("region", { name: new RegExp(set) });
  await expect(nextUp.getByRole("link", { name: "Start in stand mode" })).toBeVisible();
  const usage = page.getByRole("region", { name: "How your versions are used" });
  await expect(usage).toContainText("1 musician in 1 band played your public versions");
  await expect(usage.getByRole("row").filter({ hasText: title })).toContainText("1");
  await expect(usage).toContainText("Totals only");
  await expect(page.getByRole("region", { name: "Your band" })).toContainText("Hana Home (you)");
});
