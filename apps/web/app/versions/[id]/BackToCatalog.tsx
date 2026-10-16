"use client";

import { Button } from "@astryxdesign/core/Button";
import { useEffect, useState } from "react";
import { catalogFor } from "../../../lib/catalog/remember";
import { BackIcon } from "../../_components/ActionIcons";

/**
 * Back to the catalog as the person left it, when they came to this song from there (R-02.10):
 * an installed app has no browser back button.
 */
export function BackToCatalog({ song, label }: { song: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    // Storage is read after the first paint, so the server's page and the first render agree.
    const kept = catalogFor(song);
    if (kept) queueMicrotask(() => setUrl(kept));
  }, [song]);
  if (!url) return null;
  return <Button label={label} href={url} variant="ghost" size="sm" icon={<BackIcon />} />;
}
