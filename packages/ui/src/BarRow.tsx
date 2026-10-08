import {
  keyName,
  type Bar as BarData,
  type BarItem,
  type ChordFormatter,
  type Meter,
  type Row,
} from "chartdown";
import type { CSSProperties } from "react";
import { DEFAULT_BAR_LABELS, type BarLabels } from "./Bar";
import { barSpans, beatStrength, COLUMNS_PER_BEAT } from "./beats";

const DYNAMIC_TEXT: Record<string, string> = { cresc: "cresc.", decresc: "decresc." };
const FOUR_FOUR: Meter = { beats: 4, unit: 4 };

function Item({
  item,
  row,
  formatter,
  labels,
}: {
  item: BarItem;
  row: Row;
  formatter: ChordFormatter;
  labels: BarLabels;
}) {
  if (item.type === "riff") {
    // Provisional plain text: the drawing is T-1706, after the owner approves it (R-00.11).
    const notes = item.notes.map((note) =>
      note.type === "rest" ? "x" : formatter.root(note.root, row),
    );
    return (
      <span className="cd-chart__chord">
        <span>{`R[ ${notes.join(" ")} ]`}</span>
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
    item.push && labels.push,
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
  return (
    <span className="cd-chart__chord">
      {(item.stab || item.fermata) && (
        <span className="cd-chart__marks" aria-hidden="true">
          {item.stab && <span>^</span>}
          {item.fermata && <span>𝄐</span>}
        </span>
      )}
      {item.push && (
        <span className="cd-chart__push" aria-hidden="true">
          ‹
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
  formatter,
  labels,
}: {
  bar: BarData;
  row: Row;
  meter: Meter;
  first: boolean;
  formatter: ChordFormatter;
  labels: BarLabels;
}) {
  const columns = meter.beats * COLUMNS_PER_BEAT;
  const spans = barSpans(bar.items, meter);
  const grid = { "--chart-cols": columns } as CSSProperties;
  const classes = [
    "cd-chart__bar",
    first && "cd-chart__bar--first",
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
        {bar.cues.map((cue, index) => (
          <span key={index} className="cd-chart__cue">
            {!cue.roles.includes("everyone") && (
              <b className="cd-chart__cue-role">{cue.roles.map(labels.instrument).join(", ")} </b>
            )}
            {cue.text}
          </span>
        ))}
        {bar.repeatEnd && <span className="cd-chart__times">×{bar.repeatEnd.times}</span>}
      </div>
      {/* Each chord starts at its beat and spans its length; a dashed line marks a change. */}
      <div className="cd-chart__grid" style={grid}>
        {bar.items.map((item, index) => {
          const at = spans[index] ?? { start: 1, span: columns };
          return (
            <span
              key={index}
              className={`cd-chart__cell${index > 0 ? " cd-chart__cell--split" : ""}`}
              style={{ gridColumn: `${at.start} / span ${at.span}` }}
            >
              <Item item={item} row={row} formatter={formatter} labels={labels} />
            </span>
          );
        })}
      </div>
      {/* One slash per beat, by strength; the chords are read in order, so these are hidden. */}
      <div className="cd-chart__grid" style={grid} aria-hidden="true">
        {Array.from({ length: meter.beats }, (_, beat) => {
          const strength = beatStrength(beat, meter.beats, meter.unit);
          return (
            <span
              key={beat}
              className={`cd-chart__beat cd-chart__beat--${strength}`}
              style={{ gridColumn: `${beat * COLUMNS_PER_BEAT + 1} / span ${COLUMNS_PER_BEAT}` }}
              title={labels.beat(beat + 1, strength)}
            >
              /
            </span>
          );
        })}
      </div>
      <div className="cd-chart__lyric">{bar.lyric !== undefined && `“${bar.lyric}”`}</div>
    </div>
  );
}

export interface BarRowProps {
  /** A row of a chart, from the `chartdown` tree. */
  row: Row;
  formatter: ChordFormatter;
  /** The chart's meter, for the beats of each bar; 4/4 when not given. */
  meter?: Meter;
  labels?: BarLabels;
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
 * Repeats draw double bar lines, endings a label and a top line, and a key change a line above.
 */
export function BarRow({
  row,
  formatter,
  meter = FOUR_FOUR,
  labels = DEFAULT_BAR_LABELS,
  size = "lg",
}: BarRowProps) {
  // As many columns as the row has bars, as the approved prototype draws it.
  const bars = { "--chart-bars": Math.max(1, row.bars.length) } as CSSProperties;
  return (
    <div className={`cd-chart cd-chart--${size}`}>
      {row.keyChange && (
        <div className="cd-chart__key-change">
          {labels.keyChange(keyName(formatter.rowKey(row)))}
        </div>
      )}
      <div className="cd-chart__scroll">
        <div className="cd-chart__bars" style={bars}>
          {row.bars.map((bar, index) => (
            <OneBar
              key={index}
              bar={bar}
              row={row}
              meter={meter}
              first={index === 0}
              formatter={formatter}
              labels={labels}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
