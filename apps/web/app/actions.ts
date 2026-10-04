"use server";

import { authEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { isLocale } from "../i18n/locales";
import { rememberLocale } from "../i18n/remember";

/**
 * Switches the interface language (R-01.5). Signed in, it is saved to the profile too, so it
 * follows the person to any device. Changing a cookie in an action re-renders the page.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  await rememberLocale(locale);
  if (!authEnabled()) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ language: locale, updated_at: new Date().toISOString() })
      .eq("id", data.user.id);
  }
}
