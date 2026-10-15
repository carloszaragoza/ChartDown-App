"use client";

import { Divider } from "@astryxdesign/core/Divider";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import type { ComponentProps, ReactNode } from "react";
import { usePhone } from "../../lib/shell/phone";

type LayoutProps = Omit<ComponentProps<typeof Layout>, "start" | "end" | "content" | "children">;
type ContentProps = Omit<ComponentProps<typeof LayoutContent>, "children">;

export interface SidePanel {
  /** Where the panel sits beside the content on a wide screen. */
  side: "start" | "end";
  width: number;
  label?: string | undefined;
  role?: "region" | undefined;
  padding?: ComponentProps<typeof LayoutPanel>["padding"];
  /**
   * On a phone the panel comes before the main content (the chart editor's text, the notes
   * editor's sections); otherwise it follows it.
   */
  firstOnPhone?: boolean;
  children: ReactNode;
}

/**
 * A page with a side panel (R-03.9, design handoff 5): beside the content on an iPad or a
 * desktop, in one column on a phone, the panel after the main content (or before it, when it is
 * what the page is for). The server's guess decides the first render, so a phone never sees two
 * crushed columns first; afterwards the screen itself decides.
 */
export function PageLayout({
  phone,
  panel,
  contentProps,
  content,
  ...layout
}: LayoutProps & {
  /** The server's guess that the page opens on a phone. */
  phone: boolean;
  panel?: SidePanel | null | undefined;
  contentProps?: ContentProps;
  /** The page's main content, inside its LayoutContent. */
  content: ReactNode;
}) {
  const isPhone = usePhone(phone);
  // The page gutter is 32 px, and 16 px on a phone (design handoff 5).
  if (isPhone && layout.padding === 8) layout = { ...layout, padding: 4 };
  if (!panel)
    return (
      <Layout {...layout} content={<LayoutContent {...contentProps}>{content}</LayoutContent>} />
    );
  if (!isPhone) {
    const side = (
      <LayoutPanel
        width={panel.width}
        hasDivider
        {...(panel.label ? { label: panel.label } : {})}
        {...(panel.role ? { role: panel.role } : {})}
        {...(panel.padding !== undefined ? { padding: panel.padding } : {})}
      >
        {panel.children}
      </LayoutPanel>
    );
    return (
      <Layout
        {...layout}
        {...(panel.side === "start" ? { start: side } : { end: side })}
        content={<LayoutContent {...contentProps}>{content}</LayoutContent>}
      />
    );
  }
  const aside = (
    <section
      {...(panel.label ? { "aria-label": panel.label } : {})}
      {...(panel.role ? { role: panel.role } : {})}
    >
      {panel.children}
    </section>
  );
  return (
    <Layout
      {...layout}
      content={
        <LayoutContent {...contentProps}>
          <VStack gap={6}>
            {panel.firstOnPhone ? aside : content}
            <Divider />
            {panel.firstOnPhone ? content : aside}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
