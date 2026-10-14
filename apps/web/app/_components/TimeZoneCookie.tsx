"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "../../lib/sets/when";

/**
 * Tells the server the browser's time zone (F-004), so "today" for sets is the person's own
 * day. Kept for a year and rewritten when the device's time zone changes.
 */
export function TimeZoneCookie() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    const value = encodeURIComponent(zone);
    if (document.cookie.split("; ").includes(`${TIME_ZONE_COOKIE}=${value}`)) return;
    document.cookie = `${TIME_ZONE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
