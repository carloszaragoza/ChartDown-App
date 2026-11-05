import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, LOCALE_COOKIE, pickLocale } from "./locales";
import { personTimeZone, TIME_ZONE_COOKIE } from "../lib/sets/when";

// What the person chose (cookie, or the profile once signed in); with no choice yet, the browser's
// language when it is Spanish, and English otherwise (R-01.5).
// Every moment is written in the person's own time zone (F-014), the browser's as F-004 finds it;
// the client's formatter takes it from here, so the server's page and the browser agree.
export default getRequestConfig(async () => {
  const [store, list] = await Promise.all([cookies(), headers()]);
  const chosen = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(chosen) ? chosen : pickLocale(list.get("accept-language"));
  return {
    locale,
    timeZone: personTimeZone(store.get(TIME_ZONE_COOKIE)?.value, list.get("x-vercel-ip-timezone")),
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
