import { cookies, headers } from "next/headers";
import { personTimeZone, TIME_ZONE_COOKIE, todayIn } from "./when";

/** The signed-in person's time zone, on the server (F-004). */
export async function localTimeZone(): Promise<string> {
  const [store, list] = await Promise.all([cookies(), headers()]);
  return personTimeZone(store.get(TIME_ZONE_COOKIE)?.value, list.get("x-vercel-ip-timezone"));
}

/** The signed-in person's today, on the server (F-004). */
export async function localToday(): Promise<string> {
  return todayIn(await localTimeZone());
}
