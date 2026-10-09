"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * A link that prefetches its page only when the person shows intent: the pointer over it, a touch
 * or keyboard focus (F-003). A plain Link prefetches as soon as it is on screen, and every page of
 * the side navigation is rendered on demand, so that cost a server render per link per page.
 */
export function IntentLink({
  href,
  onPointerEnter,
  onTouchStart,
  onFocus,
  ...rest
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const prefetch = () => {
    if (typeof href === "string") router.prefetch(href);
  };
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={(event) => {
        prefetch();
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      {...rest}
    />
  );
}
