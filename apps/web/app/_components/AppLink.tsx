"use client";

import type { ComponentProps } from "react";
import { loadsWhole } from "../../lib/shell/pending";
import { IntentLink } from "./IntentLink";

/**
 * The link every Astryx component uses (F-005): a page of the app opens without a full page
 * load, prefetched on intent (F-003); a page that must load whole keeps a plain anchor.
 */
export function AppLink({ href, ...rest }: ComponentProps<"a"> & { href: string }) {
  if (loadsWhole(href) || rest.target === "_blank" || rest.download !== undefined)
    return <a href={href} {...rest} />;
  return <IntentLink href={href} {...(rest as Omit<ComponentProps<typeof IntentLink>, "href">)} />;
}
