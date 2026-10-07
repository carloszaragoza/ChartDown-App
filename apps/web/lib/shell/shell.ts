// The app shell's decisions (Design Handoff 2.0, section 4): where it shows, which item of the
// side navigation is current, and which band the person is working in.

export interface ShellBand {
  id: string;
  name: string;
  personal: boolean;
}

/** The cookie that remembers the band chosen in the side navigation. */
export const BAND_COOKIE = "cd_band";

/**
 * Pages that fill the screen have no shell: stand mode, the offline pages, the component
 * showcase, and the landing page a visitor sees at the root.
 */
export function shellHidden(pathname: string, signedIn: boolean): boolean {
  if (pathname === "/" && !signedIn) return true;
  return (
    pathname.endsWith("/stand") ||
    pathname === "/offline" ||
    pathname.startsWith("/offline/") ||
    pathname === "/design"
  );
}

export type NavItem =
  | "home"
  | "notices"
  | "sets"
  | "stand"
  | "catalog"
  | "newVersion"
  | "editor"
  | "notes"
  | "bands"
  | "personal"
  | "overview"
  | "instruments"
  | "invites"
  | "reports";

/** The side navigation's current item for a page, if any. */
export function currentItem(pathname: string, personalBand: string | null): NavItem | null {
  const starts = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (pathname === "/") return "home";
  if (starts("/notices")) return "notices";
  if (pathname === "/admin") return "overview";
  if (starts("/admin/instruments")) return "instruments";
  if (starts("/admin/invites")) return "invites";
  if (starts("/admin/reports")) return "reports";
  if (personalBand && starts(`/bands/${personalBand}`)) return "personal";
  if (starts("/bands")) return "bands";
  if (starts("/sets")) return "sets";
  if (starts("/catalog") || starts("/songs")) return "catalog";
  if (pathname === "/versions/new") return "newVersion";
  if (pathname === "/versions/mine") return "editor";
  if (/^\/versions\/[^/]+\/notes$/.test(pathname)) return "notes";
  if (/^\/versions\/[^/]+\/(edit|history|revisions\/\d+)$/.test(pathname)) return "editor";
  return null;
}

/** The version a page is about, so Chart editor and Director's notes open that version. */
export function versionOf(pathname: string): string | null {
  const match = /^\/versions\/([0-9a-f-]{36})(\/|$)/.exec(pathname);
  return match?.[1] ?? null;
}

/**
 * The band shown in the side navigation's header: the one chosen before, if the person is still
 * in it; otherwise their first band, and their personal space when they have no other.
 */
export function currentBand(
  bands: readonly ShellBand[],
  chosen: string | undefined,
): ShellBand | null {
  return (
    bands.find((band) => band.id === chosen) ??
    bands.find((band) => !band.personal) ??
    bands.find((band) => band.personal) ??
    null
  );
}

/** Two letters for an avatar: "Alex Rivera" → AR. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters
    .map((word) => word?.charAt(0).toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}
