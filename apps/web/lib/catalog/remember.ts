// Where the person was in the catalog, so a version opened from it leads back there (R-02.10):
// the search, the source, the page and the open song, kept for this tab only.

const KEY = "cd-catalog";

/** Keeps the catalog's address, with the open song in it. */
export function rememberCatalog(url: string, song: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ url, song }));
  } catch {
    // No storage, as in a private window: the version just has no way back.
  }
}

/** The catalog's address to go back to from a version of this song, or null. */
export function catalogFor(song: string): string | null {
  try {
    const kept = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as {
      url?: unknown;
      song?: unknown;
    } | null;
    return kept?.song === song && typeof kept.url === "string" && kept.url.startsWith("/catalog")
      ? kept.url
      : null;
  } catch {
    return null;
  }
}
