"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { pendingTarget } from "../../lib/shell/pending";
import { PageSkeleton } from "./PageSkeleton";
import { StandSkeleton } from "./StandSkeleton";

/** How long skeletons may stand in for a page that never comes; then the old page is back. */
const GIVE_UP_MS = 10000;

/**
 * Skeletons the moment a link to another page is tapped, until that page arrives (F-003). The
 * client draws them, not a loading boundary, so the server's answer stays what it was (a 404
 * included) and the offline page is cached whole. Only taps the router takes over count (Next's
 * Link prevents the browser's own navigation); a full page load keeps the browser's.
 */
export function PendingPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);

  // The new page is here: its path or its content changed.
  const [shown, setShown] = useState({ pathname, children });
  if (shown.pathname !== pathname || shown.children !== children) {
    setShown({ pathname, children });
    setPending(null);
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!event.defaultPrevented) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const target = pendingTarget(
        { href: link.href, target: link.target, hasDownload: link.hasAttribute("download") },
        event,
        window.location.href,
      );
      if (target) setPending(target);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (pending === null) return;
    const timer = setTimeout(() => setPending(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (pending === null) return <>{children}</>;
  return pending.endsWith("/stand") ? <StandSkeleton /> : <PageSkeleton />;
}
