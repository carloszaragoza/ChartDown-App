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
 * The ChartDown text with its flagged lines marked where they are (owner's reviews, October 15
 * and 16, 2026): a band across a line with a warning, red, or one the import asks to check,
 * amber, with the line's number inside the band at its right end; the number selects the line.
 * Other lines show no number, so the editor doesn't read like code. Lines don't wrap, so a band
 * stays on its line; a long line scrolls sideways.
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
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const marks = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<{
    lineHeight: string;
    paddingTop: string;
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const count = value.split("\n").length;
  const flagOf = new Map<number, LineFlag["kind"]>();
  for (const flag of flags)
    if (flag.line <= count && flagOf.get(flag.line) !== "warning") flagOf.set(flag.line, flag.kind);

  const goTo = (line: number) => {
    const field = area.current;
    if (!field) return;
    const { start, end } = lineRange(field.value, line);
    field.focus();
    field.setSelectionRange(start, end);
    const height = Number.parseFloat(getComputedStyle(field).lineHeight) || 20;
    field.scrollTop = Math.max(0, (line - 3) * height);
    if (marks.current) marks.current.scrollTop = field.scrollTop;
  };
  useImperativeHandle(handle, () => ({ goTo }));

  // The marks lie over the text's box: the same line height and top padding, and the same scroll.
  useEffect(() => {
    const field = area.current;
    if (!field) return;
    const follow = () => {
      if (marks.current) marks.current.scrollTop = field.scrollTop;
    };
    // Measured again when the person or the page resizes the text.
    const measure = () => {
      const style = getComputedStyle(field);
      const outer = box.current?.getBoundingClientRect();
      const inner = field.getBoundingClientRect();
      setMetrics({
        lineHeight: style.lineHeight,
        paddingTop: style.paddingTop,
        top: inner.top - (outer?.top ?? inner.top) + field.clientTop,
        left: inner.left - (outer?.left ?? inner.left) + field.clientLeft,
        width: field.clientWidth,
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
      ref={box}
      style={
        metrics
          ? ({
              "--cd-lines-height": metrics.lineHeight,
              "--cd-lines-top": metrics.paddingTop,
            } as CSSProperties)
          : undefined
      }
    >
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
      {flagOf.size > 0 && (
        <div
          className="cd-lines__marks"
          ref={marks}
          style={
            metrics
              ? {
                  top: metrics.top,
                  left: metrics.left,
                  width: metrics.width,
                  height: metrics.height,
                }
              : { display: "none" }
          }
        >
          <div className="cd-lines__track" style={{ "--cd-lines-count": count } as CSSProperties}>
            {[...flagOf].map(([line, kind]) => (
              <div
                key={line}
                className="cd-lines__mark"
                data-flag={kind}
                style={{ "--cd-lines-at": line - 1 } as CSSProperties}
              >
                <button
                  type="button"
                  className="cd-lines__number"
                  aria-label={goToLabel(line)}
                  onClick={() => goTo(line)}
                >
                  {line}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
