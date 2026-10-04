/**
 * Sign-in is hidden in production until invite codes (T-402) and the production database
 * are ready (Technical Plan 12.1). Development and preview builds have it.
 */
export function authEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (
    env.VERCEL_ENV !== "production" &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}
