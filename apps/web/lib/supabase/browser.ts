import { createBrowserClient } from "@supabase/ssr";
import { authCookie } from "./cookie";

/** The Supabase client in the browser, signed in through the same cookies as the server. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    authCookie(),
  );
}
