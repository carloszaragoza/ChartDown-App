import type { SVGProps } from "react";

/**
 * Stand mode's own icons (T-3032), drawn like the outline icons beside them (24 × 24, 1.5 stroke,
 * the text's color), one meaning each (owner's review on a regular iPad, October 29, 2026).
 */
function Outline({ children, ...props }: SVGProps<SVGSVGElement>) {
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
      {children}
    </svg>
  );
}

/** Live: a dot sending waves to both sides. */
export function LiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5.75 5.75a8.85 8.85 0 0 0 0 12.5M18.25 5.75a8.85 8.85 0 0 1 0 12.5" />
    </Outline>
  );
}
