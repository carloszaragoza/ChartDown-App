"use server";

import { getLocale } from "next-intl/server";
import { waitlistEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { readWaitlist, type WaitlistState } from "./waitlist";

/**
 * The landing page's waitlist (R-01.8, T-1310): the email, the role when the final panel gives
 * one, and which form it came from. The database function answers the same for an email already
 * on the list, so nothing is learned about who is on it; a filled hidden field is a bot, and it
 * is told it worked.
 */
export async function joinWaitlist(_: WaitlistState, form: FormData): Promise<WaitlistState> {
  const read = readWaitlist(form);
  if (read.status !== "ok") return { status: read.status };
  if (read.bot) return { status: "sent" };
  if (!waitlistEnabled()) return { status: "unavailable" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", {
    email: read.email,
    language: await getLocale(),
    role: read.role,
    source: read.source,
  });
  if (error) return { status: error.code === "22023" ? "invalid" : "error", email: read.email };
  return { status: "sent" };
}
