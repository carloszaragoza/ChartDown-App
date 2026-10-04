import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "./locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Makes this browser use a language from now on (R-01.5). Server actions and route handlers only. */
export async function rememberLocale(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}

/** The language stored in a signed-in person's profile, if any. */
export async function profileLocale(
  supabase: SupabaseClient,
  userId: string,
): Promise<Locale | undefined> {
  const { data } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", userId)
    .maybeSingle();
  return isLocale(data?.language) ? data.language : undefined;
}
