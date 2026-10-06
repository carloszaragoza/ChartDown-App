// The parameters Supabase Auth adds when a sign-in, confirmation or recovery link comes back.
const SIGN_IN_PARAMS = ["code", "token_hash", "type", "error", "error_code", "error_description"];

/**
 * Where a sign-in that landed on the site's root should go to finish: `/auth/callback` with the
 * same parameters, back to the home page. Supabase Auth falls back to the root (its Site URL)
 * when the redirect it was asked for is not on its allowed list (Technical Plan 12.1). Null
 * when the root was opened normally.
 */
export function rootCallback(search: Record<string, string | string[] | undefined>): string | null {
  const params = new URLSearchParams();
  for (const name of SIGN_IN_PARAMS) {
    const value = search[name];
    if (typeof value === "string" && value !== "") params.set(name, value);
  }
  if (!params.has("code") && !params.has("token_hash") && !params.has("error")) return null;
  params.set("next", "/");
  return `/auth/callback?${params.toString()}`;
}
