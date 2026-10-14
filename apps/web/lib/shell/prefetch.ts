import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

/**
 * Loads a page ahead, whole, data included (F-006). Next's default prefetch of a dynamic page
 * brings only its shell, so the tap that follows still waited for the server.
 */
export function prefetchWhole(router: Router, href: string): void {
  router.prefetch(href, { kind: "full" } as unknown as Parameters<Router["prefetch"]>[1]);
}
