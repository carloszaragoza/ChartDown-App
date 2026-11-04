import { Button } from "@astryxdesign/core/Button";

/**
 * Join, on the live line of stand mode, the set, Home and Notices (R-12.2, T-3046). The theme's
 * `join` button is primary on a computer and, on a touch screen, the MD calling the musician in:
 * filled in Rosewood, with its word. The screen decides in CSS, from the first paint.
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
  return (
    <Button
      label={label}
      variant="join"
      {...(href ? { href } : {})}
      {...(onClick ? { onClick } : {})}
    />
  );
}
