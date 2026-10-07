"use client";

import { Theme } from "@astryxdesign/core";
import { chartdownTheme } from "../../theme/chartdown";
import type { ReactNode } from "react";

/**
 * The Astryx theme for the whole app (Design Handoff 2.0, section 2): ChartDown's (neutral, with
 * 44 px targets on touch screens), light or dark following the system. A client component,
 * since the theme object stays on the client.
 */
export function AstryxTheme({ children }: { children: ReactNode }) {
  return (
    <Theme theme={chartdownTheme} mode="system">
      {children}
    </Theme>
  );
}
