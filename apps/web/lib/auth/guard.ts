import { notFound, redirect } from "next/navigation";
import { authEnabled } from "./enabled";
import { createClient } from "../supabase/server";

/**
 * A page for anyone signed in, such as the visual editor during the beta (R-13.1; owner's
 * decision, October 28, 2026): a visitor signs in first and comes back to `next`. Row-level
 * security still decides every read and write (Technical Plan 8.1).
 */
export async function requireSignedIn(next: string) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return { supabase, userId: auth.user.id };
}
