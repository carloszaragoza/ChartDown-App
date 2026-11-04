"use client";

import { Button } from "@astryxdesign/core/Button";
import { useTouchScreen } from "../../../lib/shell/phone";

/**
 * Join, on the live line of stand mode, the set, Home and Notices (R-12.2, T-3046). On a touch
 * screen it is the MD calling the musician in: filled in Rosewood, with its word. A computer
 * keeps the primary button.
 */
export function JoinButton({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const isTouch = useTouchScreen();
  return (
    <Button
      label={label}
      variant={isTouch ? "director" : "primary"}
      {...(href ? { href } : {})}
      {...(onClick ? { onClick } : {})}
    />
  );
}
