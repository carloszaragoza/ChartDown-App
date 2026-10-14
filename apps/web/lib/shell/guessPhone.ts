import { headers } from "next/headers";
import { isPhoneAgent } from "./phoneAgent";

/** The server's guess that the page opens on a phone (R-03.8), from the browser's user agent. */
export async function guessPhone(): Promise<boolean> {
  return isPhoneAgent((await headers()).get("user-agent"));
}
