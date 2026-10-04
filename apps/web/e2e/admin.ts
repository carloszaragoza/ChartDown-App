import type { APIRequestContext } from "@playwright/test";

// The local Supabase's service key (a fixed demo value, set by CI from `supabase status`) lets
// the tests act as the Admin: create invite codes and read the waitlist.
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const headers = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is needed for the end-to-end tests");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
};

/** A new invite code, as the Admin would create it (R-01.7). */
export async function createInvite(
  request: APIRequestContext,
  fields: Record<string, unknown> = {},
): Promise<string> {
  const response = await request.post(`${url()}/rest/v1/invite_codes`, {
    headers: { ...headers(), Prefer: "return=representation" },
    data: fields,
  });
  if (!response.ok())
    throw new Error(
      `Could not create an invite code: ${response.status()} ${await response.text()}`,
    );
  const [created] = (await response.json()) as { code: string }[];
  return created?.code ?? "";
}

/** The waitlist entries for an email, as the Admin sees them (R-01.8). */
export async function waitlistEntries(
  request: APIRequestContext,
  email: string,
): Promise<{ email: string; language: string }[]> {
  const response = await request.get(`${url()}/rest/v1/waitlist`, {
    headers: headers(),
    params: { select: "email,language", email: `eq.${email}` },
  });
  return (await response.json()) as { email: string; language: string }[];
}
