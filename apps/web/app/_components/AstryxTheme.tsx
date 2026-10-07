"use client";

import { Theme } from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import type { ReactNode } from "react";

/**
 * The Astryx theme for the whole app (Design Handoff 2.0, section 2): neutral, light or dark
 * following the system. A client component, since the theme object stays on the client.
 */
export function AstryxTheme({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme} mode="system">
      {children}
    </Theme>
  );
}
