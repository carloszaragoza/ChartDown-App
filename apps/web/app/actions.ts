"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "../i18n/locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Switches the interface language (R-01.5). Changing a cookie in an action re-renders the page. */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}
