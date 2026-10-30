"use client";

import { Item } from "@astryxdesign/core/Item";
import Link from "next/link";
import { useRef, type ComponentProps } from "react";

/**
 * A list row that leads somewhere (T-3035): its title is the link, and a tap anywhere on the row
 * follows it, with the row's hover and press, as the catalog's songs do. The row's own buttons,
 * such as a band's Sets, still answer for themselves, and the row adds no second tab stop.
 */
export function LinkRow({
  href,
  title,
  ...item
}: Omit<ComponentProps<typeof Item>, "label" | "href" | "onClick" | "interactiveRef" | "as"> & {
  href: string;
  title: string;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  return (
    <Item
      as="li"
      {...item}
      label={
        <Link ref={link} href={href}>
          {title}
        </Link>
      }
      interactiveRef={link}
    />
  );
}
