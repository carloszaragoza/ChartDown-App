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

/** Who is signed in, as a page needs it: their id and email. */
export interface SignedIn {
  id: string;
  email?: string;
}

/** The parts of a Supabase client that reading the session's claims needs. */
interface ClaimsReader {
  auth: {
    getClaims(): Promise<{ data: { claims: { sub?: string; email?: string } } | null }>;
  };
}

/**
 * Who is signed in, for pages (F-005): read from the session token's claims, verified with the
 * project's public signing key (ES256) without a call to Supabase Auth. Row-level security still
 * decides what every query returns; server actions keep asking Supabase Auth (`getUser()`).
 */
export async function readUser(
  supabase: ClaimsReader,
): Promise<{ data: { user: SignedIn } } | { data: { user: null } }> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { data: { user: null } };
  return {
    data: { user: { id: claims.sub, ...(claims.email ? { email: claims.email } : {}) } },
  };
}
