"use client";

import { useEffect } from "react";
import { syncSets } from "../../lib/offline/store";

/**
 * Brings downloaded sets up to date when the app opens with a connection and each time the
 * connection comes back (R-08.3, T-903). Only for a signed-in person.
 */
export function OfflineSync() {
  useEffect(() => {
    const sync = () => void syncSets().catch(() => undefined);
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);
  return null;
}
