/**
 * Sign-in, and every page that reads the database: open in development and previews; in
 * production only once the beta opens, with BETA_OPEN=true in Vercel (T-1203, Technical Plan
 * 12.1). Any other value, and a redeploy, closes them again with no code change.
 */
export function authEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) return false;
  return env.VERCEL_ENV !== "production" || env.BETA_OPEN === "true";
}

/**
 * The landing page's waitlist works wherever the database is configured, production included
 * (T-1201): it needs no email provider or sign-in.
 */
export function waitlistEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
