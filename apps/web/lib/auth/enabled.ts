/**
 * Sign-in is hidden in production until the beta opens: the production database, an email
 * provider (T-406) and the Google app published (Technical Plan 12.1). Development and preview
 * builds have it.
 */
export function authEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (
    env.VERCEL_ENV !== "production" &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

/**
 * The landing page's waitlist works wherever the database is configured, production included
 * (T-1201): it needs no email provider or sign-in.
 */
export function waitlistEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
