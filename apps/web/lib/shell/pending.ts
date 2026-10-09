/** The parts of a click that decide whether it is a plain tap (F-003). */
export interface TapLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** The parts of a link that decide where a tap goes. */
export interface LinkLike {
  href: string;
  target: string;
  hasDownload: boolean;
}

/**
 * The page a tap leads to, when it is another page of the app (F-003): a plain left click on a
 * link of the same site to a different path. A new tab, a download, another site, or a link that
 * stays on the same page (a stand-mode section, numbers or letters) gives null: no skeletons.
 */
export function pendingTarget(link: LinkLike, tap: TapLike, current: string): string | null {
  if (tap.button !== 0 || tap.metaKey || tap.ctrlKey || tap.shiftKey || tap.altKey) return null;
  if (link.hasDownload || (link.target !== "" && link.target !== "_self")) return null;
  let to: URL;
  let from: URL;
  try {
    from = new URL(current);
    to = new URL(link.href, from);
  } catch {
    return null;
  }
  if (to.origin !== from.origin || to.pathname === from.pathname) return null;
  return to.pathname;
}
