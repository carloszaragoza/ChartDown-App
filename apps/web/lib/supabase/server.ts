import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** A Supabase client for this request, acting as the signed-in person through their cookies. */
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
          } catch {
            // Server components cannot set cookies; proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
