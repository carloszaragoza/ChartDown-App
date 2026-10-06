"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { waitlistEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";

/**
 * The landing page's waitlist (R-01.8, T-1201). It works in production too, once the database is
 * there; the database function always answers the same, so nothing is learned about who is on it.
 */
export async function joinWaitlist(form: FormData): Promise<void> {
  if (!waitlistEnabled()) redirect("/?waitlist=unavailable#invite");
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", {
    email: String(form.get("email") ?? "").trim(),
    language: await getLocale(),
  });
  if (error) {
    // A malformed email is the person's to fix; anything else means the database is not ready.
    redirect(`/?waitlist=${error.code === "22023" ? "invalid" : "unavailable"}#invite`);
  }
  redirect("/?waitlist=sent#invite");
}
