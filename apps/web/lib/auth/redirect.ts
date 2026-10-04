/**
 * Where to go after a sign-in link: only a path inside this app, never another site
 * (Technical Plan 12.1). Anything else goes home.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
