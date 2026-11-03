"use client";

import { useEffect } from "react";
import { rememberCatalog } from "../../lib/catalog/remember";

/**
 * Keeps where the person is in the catalog, so a version opened from this page leads back here
 * (R-02.10).
 */
export function RememberCatalog({ url, songs }: { url: string; songs: string[] }) {
  const ids = songs.join(" ");
  useEffect(() => {
    rememberCatalog(url, ids ? ids.split(" ") : []);
  }, [url, ids]);
  return null;
}
