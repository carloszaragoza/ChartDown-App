"use server";

import { redirect } from "next/navigation";
import { isLocale } from "../../i18n/locales";
import { rememberLocale } from "../../i18n/remember";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";

/** Saves a person's name, language and instruments (R-01.2, R-01.5). */
export async function saveProfile(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/profile");
  const userId = auth.user.id;

  const name = String(form.get("name") ?? "").trim();
  const language = form.get("language");
  if (name.length < 1 || name.length > 80) redirect("/profile?error=name");
  if (!isLocale(language)) redirect("/profile?error=unknown");

  const { error } = await supabase
    .from("profiles")
    .update({ name, language, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) redirect("/profile?error=unknown");

  // Only what changed: kept instruments stay even if the Admin has since deactivated them (R-07.3).
  const chosen = new Set(form.getAll("instrument").map(String));
  const { data: current } = await supabase
    .from("user_instruments")
    .select("instrument_id")
    .eq("user_id", userId);
  const had = new Set((current ?? []).map((row) => row.instrument_id as string));
  const removed = [...had].filter((id) => !chosen.has(id));
  const added = [...chosen].filter((id) => !had.has(id));
  if (removed.length > 0) {
    await supabase
      .from("user_instruments")
      .delete()
      .eq("user_id", userId)
      .in("instrument_id", removed);
  }
  if (added.length > 0) {
    const { error: addError } = await supabase
      .from("user_instruments")
      .insert(added.map((instrument_id) => ({ user_id: userId, instrument_id })));
    if (addError) redirect("/profile?error=unknown");
  }

  await rememberLocale(language);
  redirect("/profile?saved=1");
}

/** Deletes the signed-in person's account for good, after they confirm with their email (R-01.6). */
export async function deleteAccount(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account", {
    confirm_email: String(form.get("confirm") ?? ""),
  });
  if (error) redirect("/profile?error=confirm#delete");
  // The account no longer exists; this clears the session cookies.
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
