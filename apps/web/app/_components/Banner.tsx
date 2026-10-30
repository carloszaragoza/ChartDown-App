import { Banner as AstryxBanner } from "@astryxdesign/core/Banner";
import type { ComponentProps } from "react";

// What each status announces: an error or a warning at once, the rest politely.
const ROLE = { error: "alert", warning: "alert", info: "status", success: "status" } as const;

/**
 * Astryx's Banner, announced by screen readers as it was before Astryx 0.7 (T-3036): 0.7 took the
 * live region away from Banner ("pass an explicit role"), so a message such as "Check your email"
 * or "The lineup was saved" would have appeared in silence. An explicit `role` still wins.
 */
export function Banner(props: ComponentProps<typeof AstryxBanner>) {
  return <AstryxBanner role={ROLE[props.status]} {...props} />;
}
