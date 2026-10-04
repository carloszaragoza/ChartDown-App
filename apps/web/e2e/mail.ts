import type { APIRequestContext } from "@playwright/test";

// The local Supabase catches every email in Mailpit (supabase/config.toml, [local_smtp]).
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** The newest sign-in link sent to this address, waiting for it to arrive. */
export async function latestLink(
  request: APIRequestContext,
  to: string,
  sentAfter: number,
): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await request.get(`${MAILPIT}/api/v1/search`, {
      params: { query: `to:"${to}"` },
    });
    const { messages = [] } = (await search.json()) as {
      messages?: { ID: string; Created: string }[];
    };
    const fresh = messages.find((message) => Date.parse(message.Created) >= sentAfter - 1000);
    if (fresh) {
      const message = (await (
        await request.get(`${MAILPIT}/api/v1/message/${fresh.ID}`)
      ).json()) as { HTML?: string; Text?: string };
      const link = /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/.exec(
        `${message.HTML ?? ""} ${message.Text ?? ""}`,
      )?.[0];
      if (link) return link.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign-in email for ${to}`);
}
