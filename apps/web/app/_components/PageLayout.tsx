"use client";

import { Divider } from "@astryxdesign/core/Divider";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
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

/** The least room the main content keeps beside a side panel; with less, the panel goes below. */
const CONTENT_MIN_PX = 480;

/**
 * A page with a side panel (R-03.9, design handoff 5): beside the content where both have room, in
 * one column otherwise, as on a phone or an iPad upright with the side navigation open (owner's
 * review, October 30, 2026, T-3042), the panel after the main content (or before it, when it is
 * what the page is for). The server's guess decides the first render, so a phone never sees two
 * crushed columns first; afterwards the room itself decides.
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
  // The room for the content and the panel together, measured where the content starts: beside
  // the panel it lacks the panel's width, under it it has all of it.
  const probe = useRef<HTMLDivElement | null>(null);
  const [isNarrow, setNarrow] = useState(false);
  const width = panel?.width;
  useEffect(() => {
    const box = probe.current;
    if (!box || width === undefined) return;
    const fit = () => {
      const room = box.clientWidth + (isNarrow ? 0 : width);
      setNarrow(room - width < CONTENT_MIN_PX);
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(box);
    return () => watch.disconnect();
  }, [width, isNarrow, isPhone]);
  const marker = <div ref={probe} aria-hidden="true" />;
  // The page gutter is 32 px, and 16 px on a phone (design handoff 5).
  if (isPhone && layout.padding === 8) layout = { ...layout, padding: 4 };
  if (!panel)
    return (
      <Layout {...layout} content={<LayoutContent {...contentProps}>{content}</LayoutContent>} />
    );
  if (!isPhone && !isNarrow) {
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
        content={
          <LayoutContent {...contentProps}>
            {marker}
            {content}
          </LayoutContent>
        }
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
          {marker}
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
