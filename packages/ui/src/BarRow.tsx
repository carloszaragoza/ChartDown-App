import {
  keyName,
  layoutBeats,
  type Bar as BarData,
  type BarItem,
  type ChordFormatter,
  type Meter,
  type Row,
} from "chartdown";
import type { CSSProperties } from "react";
import { DEFAULT_BAR_LABELS, type BarLabels } from "./Bar";
import { barSpans, COLUMNS_PER_BEAT, PICKUP_MIN } from "./beats";
import { beatMarks, showBeats, tokenSpans, type BeatsMode } from "./beatMarks";

const DYNAMIC_TEXT: Record<string, string> = { cresc: "cresc.", decresc: "decresc." };
const FOUR_FOUR: Meter = { beats: 4, unit: 4 };

/** The words of the tempo and navigation marks: musical terms, the same in every language. */
const TEMPO_MARK_TEXT = { rit: "rit.", accel: "accel.", atempo: "a tempo" } as const;
const NAV_TEXT = {
  segno: "Segno",
  coda: "Coda",
  tocoda: "To Coda",
  fine: "Fine",
  ds: "D.S.",
  dsalcoda: "D.S. al Coda",
  dsalfine: "D.S. al Fine",
  dc: "D.C.",
  dcalcoda: "D.C. al Coda",
  dcalfine: "D.C. al Fine",
} as const;

/** "2x" or "1x,3x": the passes of a repeat a cue or a note is for (spec 9.1). */
export const passesText = (passes: readonly number[]) => passes.map((pass) => `${pass}x`).join(",");

/** The meter a bar is drawn in: its own `[m:N/D]`, else its row's, else the given one. */
const meterOf = (bar: BarData, row: Row, fallback: Meter): Meter =>
  bar.meter ?? row.meter ?? fallback;

function Item({
  item,
  row,
  formatter,
  labels,
  beats,
  aheadOfBeat = false,
}: {
  item: BarItem;
  row: Row;
  formatter: ChordFormatter;
  labels: BarLabels;
  /** The beats this item takes of its bar, for the notes of a riff. */
  beats: number;
  /** In a bar with marks, a push is drawn slightly ahead of its slash (section 5). */
  aheadOfBeat?: boolean;
}) {
  if (item.type === "riff") {
    const { shares } = layoutBeats(item.notes, beats);
    return (
      <span className="cd-chart__riff" role="group" aria-label={labels.riff}>
        {item.notes.map((note, index) => (
          <span
            key={index}
            className={`cd-chart__riff-note${note.type === "rest" ? " cd-chart__riff-rest" : ""}`}
            style={{ flex: `${shares[index]} 1 0` }}
          >
            {note.type === "rest" ? "x" : formatter.root(note.root, row)}
          </span>
        ))}
      </span>
    );
  }
  if (item.type !== "chord") {
    const [glyph, words, extra] = {
      "no-chord": ["N.C.", labels.noChord, " cd-chart__no-chord"],
      "repeat-bar": ["%", labels.repeatBar, ""],
      tie: ["⁀", labels.tie, ""],
    }[item.type];
    return (
      <span className={`cd-chart__chord cd-chart__muted${extra}`}>
        <span aria-hidden="true">{glyph}</span>
        <span className="cd-visually-hidden">{words}</span>
      </span>
    );
  }
  const { root, quality, bass } = formatter.chord(item, row);
  const said = [
    item.push && (item.shortPush ? labels.shortPush : labels.push),
    item.hold && labels.hold,
    item.stab && labels.stab,
    item.fermata && labels.fermata,
  ].filter(Boolean);
  const name = (
    <>
      {root}
      {quality && <sup className="cd-chart__quality">{quality}</sup>}
      {bass && <span className="cd-chart__bass">/{bass}</span>}
    </>
  );
  const ahead =
    aheadOfBeat && item.push
      ? item.shortPush
        ? " cd-chart__chord--early-short"
        : " cd-chart__chord--early"
      : "";
  return (
    <span className={`cd-chart__chord${ahead}`}>
      {(item.stab || item.fermata) && (
        <span className="cd-chart__marks" aria-hidden="true">
          {item.stab && <span>^</span>}
          {item.fermata && <span>𝄐</span>}
        </span>
      )}
      {item.push && (
        <span className="cd-chart__push" aria-hidden="true">
          {item.shortPush ? "‹‹" : "‹"}
        </span>
      )}
      {item.hold ? <span className="cd-chart__hold">{name}</span> : name}
      {said.length > 0 && <span className="cd-visually-hidden">{` (${said.join(", ")})`}</span>}
    </span>
  );
}

function OneBar({
  bar,
  row,
  meter,
  first,
  marks,
  plain,
  formatter,
  labels,
}: {
  bar: BarData;
  row: Row;
  /** The meter this bar is drawn in. */
  meter: Meter;
  first: boolean;
  /** The bar shows beat marks (R-03.7). */
  marks: boolean;
  /** No bar of the row shows marks, so the row has no beat line at all. */
  plain: boolean;
  formatter: ChordFormatter;
  labels: BarLabels;
}) {
  // A pickup has only the beats it was written with (spec 5.3).
  const beats = bar.pickup ?? meter.beats;
  const columns = Math.round(beats * COLUMNS_PER_BEAT);
  const spans = barSpans(bar.items, { ...meter, beats });
  const grid = { "--chart-cols": columns } as CSSProperties;
  const classes = [
    "cd-chart__bar",
    first && "cd-chart__bar--first",
    bar.pickup !== undefined && "cd-chart__bar--pickup",
    plain && "cd-chart__bar--plain",
    bar.repeatStart && "cd-chart__bar--repeat-start",
    bar.repeatEnd && "cd-chart__bar--repeat-end",
    bar.ending && "cd-chart__bar--ending",
  ].filter(Boolean);
  return (
    <div role="group" className={classes.join(" ")}>
      <div className="cd-chart__tags">
        {bar.ending && <span className="cd-chart__ending">{bar.ending.join(", ")}.</span>}
        {bar.dynamic && (
          <i className="cd-chart__dynamic">{DYNAMIC_TEXT[bar.dynamic] ?? bar.dynamic}</i>
        )}
        {bar.meter && <i className="cd-chart__mark">{`${bar.meter.beats}/${bar.meter.unit}`}</i>}
        {bar.tempoMark && <i className="cd-chart__mark">{TEMPO_MARK_TEXT[bar.tempoMark]}</i>}
        {bar.nav?.map((mark) => (
          <span key={mark} className="cd-chart__nav">
            {NAV_TEXT[mark]}
          </span>
        ))}
        {bar.cues.map((cue, index) => {
          const who = [
            cue.passes.length > 0 ? passesText(cue.passes) : "",
            cue.roles.includes("everyone") ? "" : cue.roles.map(labels.instrument).join(", "),
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <span key={index} className="cd-chart__cue">
              {who && <b className="cd-chart__cue-role">{who} </b>}
              {cue.text}
            </span>
          );
        })}
        {bar.repeatEnd && <span className="cd-chart__times">×{bar.repeatEnd.times}</span>}
      </div>
      {marks ? (
        // Each chord starts at its beat and spans its length; a dashed line marks a change.
        <div className="cd-chart__grid" style={grid}>
          {bar.items.map((item, index) => {
            const at = spans[index] ?? { start: 1, span: columns };
            return (
              <span
                key={index}
                className={`cd-chart__cell${index > 0 ? " cd-chart__cell--split" : ""}`}
                style={{ gridColumn: `${at.start} / span ${at.span}` }}
              >
                <Item
                  item={item}
                  row={row}
                  formatter={formatter}
                  labels={labels}
                  beats={at.span / COLUMNS_PER_BEAT}
                  aheadOfBeat
                />
              </span>
            );
          })}
        </div>
      ) : (
        // No marks: the chords are spread evenly across the bar, as on a printed chart.
        <div className="cd-chart__spread">
          {bar.items.map((item, index) => (
            <Item
              key={index}
              item={item}
              row={row}
              formatter={formatter}
              labels={labels}
              beats={beats / Math.max(bar.items.length, 1)}
            />
          ))}
        </div>
      )}
      {/* The marks, by the bar's meter; the chords are read in order, so these are hidden. */}
      {marks ? (
        <div className="cd-chart__grid" style={grid} aria-hidden="true">
          {beatMarks(bar, row).map((mark) => {
            // A rest dims the slashes of the beats it covers, so they can still be counted.
            const resting = tokenSpans(bar, row).some(
              ({ item, start, end }) =>
                item.type === "no-chord" && mark.at >= start - 1e-6 && mark.at < end - 1e-6,
            );
            return (
              <span
                key={mark.at}
                className={`cd-chart__beat cd-chart__beat--${mark.strength}${resting ? " cd-chart__beat--rest" : ""}`}
                style={{
                  gridColumn: `${Math.round(mark.at * COLUMNS_PER_BEAT) + 1} / span ${Math.max(Math.round(mark.length * COLUMNS_PER_BEAT), 1)}`,
                }}
                title={labels.beat(mark.number, mark.strength)}
              >
                /
              </span>
            );
          })}
        </div>
      ) : (
        // The row shares one beat line: a bar without marks leaves its cell empty.
        !plain && <div aria-hidden="true" />
      )}
      <div className="cd-chart__lyric">{bar.lyric !== undefined && `“${bar.lyric}”`}</div>
    </div>
  );
}

export interface BarRowProps {
  /** A row of a chart, from the `chartdown` tree. */
  row: Row;
  formatter: ChordFormatter;
  /** The meter for a bar that has none of its own and a row without one; 4/4 when not given. */
  meter?: Meter;
  labels?: BarLabels;
  /** How many bars show beat marks (R-03.7); Always when not given. */
  beats?: BeatsMode;
  /**
   * "lg" is stand mode, "md" the viewer and the editors, "sm" the next-section preview: smaller,
   * in the secondary color.
   */
  size?: "lg" | "md" | "sm";
}

/**
 * A row of bars, drawn by the chart viewer rules (T-1309, design/chart-viewer): each bar has a
 * tags line, its chords on a grid of 12 columns per beat, a slash per beat by strength and the
 * lyric landmark; every bar of the row shares those lines, so the chords stand on one baseline.
 * Repeats draw double bar lines, endings a label and a top line, a key, meter or tempo change a
 * line above, and the elements of ChartDown 0.5 and 0.6 follow design/chart-viewer section 10
 * (T-1706): a narrow pickup, unison riffs, short pushes, meter and tempo marks, navigation chips
 * and cues for one pass.
 */
export function BarRow({
  row,
  formatter,
  meter = FOUR_FOUR,
  labels: given,
  beats = "always",
  size = "lg",
}: BarRowProps) {
  const labels: Required<BarLabels> = { ...DEFAULT_BAR_LABELS, ...given };
  // As many columns as the row has bars, as the approved prototype draws it; a pickup is narrower.
  const weights = row.bars.map((bar) =>
    bar.pickup === undefined
      ? 1
      : Math.max(bar.pickup / meterOf(bar, row, meter).beats, PICKUP_MIN),
  );
  const bars = {
    "--chart-bars": Math.max(1, row.bars.length),
    // On a phone in portrait a row wraps into lines of two bars (R-03.8, chart.css).
    "--chart-bars-phone": Math.min(2, Math.max(1, row.bars.length)),
  } as CSSProperties & Record<string, unknown>;
  if (weights.some((weight) => weight !== 1)) {
    bars["--chart-bar-columns"] = weights
      .map((weight) => `minmax(calc(var(--chart-bar-min-width) * ${weight}), ${weight}fr)`)
      .join(" ");
  }
  const shown = row.bars.map((bar, index) =>
    showBeats(bar, row, beats, {
      firstAfterMeterChange: index === 0 && row.meterChange !== undefined,
    }),
  );
  const plain = !shown.some(Boolean);
  const change =
    row.meterChange || row.tempoChange !== undefined
      ? labels.meterTempoChange({
          ...(row.meterChange ? { meter: `${row.meterChange.beats}/${row.meterChange.unit}` } : {}),
          ...(row.tempoChange !== undefined ? { tempo: row.tempoChange } : {}),
        })
      : "";
  return (
    <div className={`cd-chart cd-chart--${size}`}>
      {row.keyChange && (
        <div className="cd-chart__key-change">
          {labels.keyChange(keyName(formatter.rowKey(row)))}
        </div>
      )}
      {change && <div className="cd-chart__key-change">{change}</div>}
      <div className="cd-chart__scroll">
        <div className={`cd-chart__bars${plain ? " cd-chart__bars--plain" : ""}`} style={bars}>
          {row.bars.map((bar, index) => (
            <OneBar
              key={index}
              bar={bar}
              row={row}
              meter={meterOf(bar, row, meter)}
              first={index === 0}
              marks={shown[index] === true}
              plain={plain}
              formatter={formatter}
              labels={labels}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
