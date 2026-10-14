"use client";

import { Theme } from "@astryxdesign/core";
import { LinkProvider } from "@astryxdesign/core/Link";
import { chartdownTheme } from "../../theme/chartdown";
import type { ReactNode } from "react";
import { AppLink } from "./AppLink";

/**
 * The Astryx theme for the whole app (Design Handoff 2.0, section 2): ChartDown's (neutral, with
 * 44 px targets on touch screens), light or dark following the system. A client component,
 * since the theme object stays on the client. Its links move inside the app (F-005).
 */
export function AstryxTheme({ children }: { children: ReactNode }) {
  return (
    <Theme theme={chartdownTheme} mode="system">
      <LinkProvider component={AppLink}>{children}</LinkProvider>
    </Theme>
  );
}
