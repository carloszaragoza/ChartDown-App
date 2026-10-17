import type { SVGProps } from "react";

/**
 * A metronome, drawn like the outline icons beside it (24 × 24, 1.5 stroke, the text's color):
 * its body, its scale and its pendulum. Heroicons has none (owner's review, October 17, 2026).
 */
export function MetronomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9.75 3.75h4.5l4.5 16.5H5.25l4.5-16.5Z" />
      <path d="M7.4 15.75h9.2" />
      <path d="M12 15.75 17.25 6" />
      <circle cx="16.1" cy="8.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
