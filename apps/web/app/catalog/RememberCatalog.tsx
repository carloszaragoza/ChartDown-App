"use client";

import { useEffect } from "react";
import { rememberCatalog } from "../../lib/catalog/remember";

/**
 * Keeps where the person is in the catalog, and brings the open song into view when they come
 * back to it (R-02.10).
 */
export function RememberCatalog({
  url,
  song,
  target,
}: {
  url: string;
  song: string;
  target: string;
}) {
  useEffect(() => {
    rememberCatalog(url, song);
    document.getElementById(target)?.scrollIntoView({ block: "nearest" });
  }, [url, song, target]);
  return null;
}
