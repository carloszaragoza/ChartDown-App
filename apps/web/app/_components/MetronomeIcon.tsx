import type { SVGProps } from "react";

/**
 * A metronome, drawn like the outline icons beside it (24 × 24, 1.5 stroke, the text's color):
 * its body, its scale and its pendulum. Heroicons has none (owner's review, October 17, 2026).
 * Playing, the pendulum swings to the other side on every beat, taking the beat's time to get
 * there (T-2701); with reduced motion it only changes side.
 */
export function MetronomeIcon({
  beat,
  seconds,
  ...props
}: SVGProps<SVGSVGElement> & {
  /** The beat sounding, from 1, while it plays. */
  beat?: number | undefined;
  /** How long a beat lasts, for the swing. */
  seconds?: number | undefined;
}) {
  // At rest the pendulum leans right; playing, it is right on odd beats and left on even ones.
  const angle = beat === undefined ? 0 : beat % 2 === 1 ? 0 : -56;
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
      <g
        className="cd-metronome-pendulum"
        style={{
          transform: `rotate(${angle}deg)`,
          ...(seconds ? { transitionDuration: `${seconds}s` } : {}),
        }}
      >
        <path d="M12 15.75 17.25 6" />
        <circle cx="16.1" cy="8.1" r="0.9" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
