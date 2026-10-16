"use client";

import { TextArea } from "@astryxdesign/core/TextArea";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { lineRange } from "../../lib/versions/lines";

/** A line of the chart to point at: a parser warning, or something an import asks to check. */
export interface LineFlag {
  line: number;
  kind: "warning" | "review";
}

export interface ChartTextAreaHandle {
  /** Selects a line of the text and brings it into view. */
  goTo: (line: number) => void;
}

/**
 * The ChartDown text with its line numbers beside it (owner's review, October 15, 2026): the
 * warnings and the import's review name lines, so the editor shows them. A flagged line's number
 * is marked, red for a warning and amber for something to check; a number selects its line.
 * Lines don't wrap, so each number stays beside its line; a long line scrolls sideways.
 */
export function ChartTextArea({
  handle,
  label,
  value,
  onChange,
  rows,
  flags = [],
  htmlName,
  isRequired,
  status,
  goToLabel,
}: {
  handle?: Ref<ChartTextAreaHandle>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  flags?: LineFlag[];
  htmlName?: string;
  isRequired?: boolean;
  status?: { type: "error"; message: string } | undefined;
  /** "Go to line {line}", for the numbers a person can choose. */
  goToLabel: (line: number) => string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<{
    lineHeight: string;
    paddingTop: string;
    height: number;
  } | null>(null);
  const count = value.split("\n").length;
  const flagOf = new Map<number, LineFlag["kind"]>();
  for (const flag of flags)
    if (flagOf.get(flag.line) !== "warning") flagOf.set(flag.line, flag.kind);

  const goTo = (line: number) => {
    const field = area.current;
    if (!field) return;
    const { start, end } = lineRange(field.value, line);
    field.focus();
    field.setSelectionRange(start, end);
    const height = Number.parseFloat(getComputedStyle(field).lineHeight) || 20;
    field.scrollTop = Math.max(0, (line - 3) * height);
    if (gutter.current) gutter.current.scrollTop = field.scrollTop;
  };
  useImperativeHandle(handle, () => ({ goTo }));

  // The numbers follow the text: the same line height and top padding, and the same scroll.
  useEffect(() => {
    const field = area.current;
    if (!field) return;
    const follow = () => {
      if (gutter.current) gutter.current.scrollTop = field.scrollTop;
    };
    // As tall as the text's box, measured again when the person resizes it.
    const measure = () => {
      const style = getComputedStyle(field);
      setMetrics({
        lineHeight: style.lineHeight,
        paddingTop: style.paddingTop,
        height: field.clientHeight,
      });
      follow();
    };
    measure();
    const resized = new ResizeObserver(measure);
    resized.observe(field);
    field.addEventListener("scroll", follow);
    return () => {
      resized.disconnect();
      field.removeEventListener("scroll", follow);
    };
  }, []);

  return (
    <div
      className="cd-lines"
      style={
        metrics
          ? ({
              "--cd-lines-height": metrics.lineHeight,
              "--cd-lines-top": metrics.paddingTop,
              "--cd-lines-box": `${metrics.height}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="cd-lines__gutter" ref={gutter}>
        {Array.from({ length: count }, (_, index) => {
          const line = index + 1;
          const kind = flagOf.get(line);
          return kind ? (
            <button
              key={line}
              type="button"
              className="cd-lines__number"
              data-flag={kind}
              aria-label={goToLabel(line)}
              onClick={() => goTo(line)}
            >
              {line}
            </button>
          ) : (
            <span key={line} className="cd-lines__number" aria-hidden="true">
              {line}
            </span>
          );
        })}
      </div>
      <TextArea
        ref={area}
        label={label}
        isLabelHidden
        value={value}
        onChange={onChange}
        rows={rows}
        hasSpellCheck={false}
        {...(htmlName ? { htmlName } : {})}
        {...(isRequired ? { isRequired } : {})}
        {...(status ? { status } : {})}
      />
    </div>
  );
}
