import { expect, test } from "@playwright/test";
import { signUpAndConfirm, unique } from "./flows";
import { TERMS_VERSION } from "../lib/legal/texts";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

test("T-1202 a visitor reads the terms and the privacy notice from the landing page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "ChartDown App – Terms of Use (Private Beta)" }),
  ).toBeVisible();
  await expect(page.getByText("contact@chartdown.app")).toBeVisible();
  await page.getByRole("link", { name: "Also read: Privacy Notice" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "ChartDown App – Privacy Notice (Private Beta)" }),
  ).toBeVisible();
  await expect(page.getByText("Resend:")).toBeVisible();
});

test("T-1202 creating an account needs the terms accepted, and the profile keeps which ones", async ({
  page,
  request,
}) => {
  await page.goto("/auth/sign-up");
  // Continue waits for the terms to be accepted.
  const accept = page.getByRole("checkbox", { name: /^I accept the Terms of Use/ });
  await expect(accept).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Notice" })).toHaveAttribute(
    "href",
    "/privacy",
  );

  const name = `Terms Test ${Date.now()}`;
  await signUpAndConfirm(page, unique("terms"), name);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const response = await request.get(`${url()}/rest/v1/profiles`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    params: { select: "terms_version,terms_accepted_at", name: `eq.${name}` },
  });
  const [profile] = (await response.json()) as {
    terms_version: string;
    terms_accepted_at: string;
  }[];
  expect(profile?.terms_version).toBe(TERMS_VERSION);
  expect(profile?.terms_accepted_at).toBeTruthy();
});
