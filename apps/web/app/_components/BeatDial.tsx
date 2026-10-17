/**
 * The beat as a dial (T-2701; owner's review, October 17, 2026): a circle of one slice per beat of
 * the bar, filled up to the beat sounding, the one sounding in full ink. It takes the metronome
 * icon's place while it plays and never changes size, so the control keeps its width. Hue-free:
 * the count is shape and ink, and the "2 / 4" beside it says it in words (R-11.3).
 */
export function BeatDial({ beat, of }: { beat: number; of: number }) {
  const slices = Math.max(1, Math.min(of, 16));
  const center = 12;
  const radius = 9;
  const point = (slice: number) => {
    const angle = (slice / slices) * 2 * Math.PI - Math.PI / 2;
    return `${center + radius * Math.cos(angle)} ${center + radius * Math.sin(angle)}`;
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      data-beat={beat}
    >
      {Array.from({ length: slices }, (_, slice) => {
        const sounding = slice === beat - 1;
        const passed = slice < beat - 1;
        const large = slices === 1 ? 1 : 0;
        const d =
          slices === 1
            ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius} Z`
            : `M ${center} ${center} L ${point(slice)} A ${radius} ${radius} 0 ${large} 1 ${point(slice + 1)} Z`;
        return (
          <path
            key={slice}
            d={d}
            fill={sounding || passed ? "currentColor" : "none"}
            fillOpacity={sounding ? 1 : passed ? 0.4 : 0}
          />
        );
      })}
    </svg>
  );
}
