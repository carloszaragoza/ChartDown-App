import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

/**
 * Loads a page ahead, whole, data included (F-006). Next's default prefetch of a dynamic page
 * brings only its shell, so the tap that follows still waited for the server.
 */
export function prefetchWhole(router: Router, href: string): void {
  router.prefetch(href, { kind: "full" } as unknown as Parameters<Router["prefetch"]>[1]);
}

/**
 * Whether a link opens stand mode, a set's song or a version's (F-008). Stand mode only reads, so
 * it is loaded whole on intent and opens at once; other pages keep the partial prefetch (F-003).
 */
export function opensStand(href: string): boolean {
  return /^\/(sets\/[^/]+\/songs\/\d+|versions\/[^/]+)\/stand(?:[?#]|$)/.test(href);
}
