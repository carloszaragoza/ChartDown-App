/**
 * The session cookie's name (T-2818): the one the project's own address gives it,
 * `sb-<project ref>-auth-token`, even when Supabase is reached through chartdown.app's own
 * domain, whose first label would name it otherwise and sign everyone out. Without a project
 * ref, the library names it as before.
 */
export function authCookie(ref = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF): {
  cookieOptions?: { name: string };
} {
  return ref ? { cookieOptions: { name: `sb-${ref}-auth-token` } } : {};
}
