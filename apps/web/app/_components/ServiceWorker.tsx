"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (T-901) in production builds, where the app is installed;
 * in development it would keep files that are still changing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installing is an extra; the app works the same without it.
    });
  }, []);
  return null;
}
