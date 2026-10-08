import type { Bar as BarData, BarItem, ChordFormatter, Row } from "chartdown";

export type BarSize = "xl" | "md" | "sm";

/** Words for marks and special bars, read by screen readers. English unless the app passes its own. */
export interface BarLabels {
  push: string;
  hold: string;
  stab: string;
  fermata: string;
  noChord: string;
  repeatBar: string;
  tie: string;
  /** The instrument's name in the interface language, for instrument cues. */
  instrument: (id: string) => string;
  /** The line above a row after `@key`, for example "Key change: A". */
  keyChange: (key: string) => string;
  /** A beat slash's title, for example "Beat 3: semi-strong". */
  beat: (beat: number, strength: "strong" | "semi" | "weak") => string;
}

export const DEFAULT_BAR_LABELS: BarLabels = {
  push: "push",
  hold: "hold",
  stab: "stab",
  fermata: "fermata",
  noChord: "no chord",
  repeatBar: "repeat the previous bar",
  tie: "tied over",
  instrument: (id) => id.charAt(0).toUpperCase() + id.slice(1),
  keyChange: (key) => `Key change: ${key}`,
  beat: (beat, strength) =>
    `Beat ${beat}: ${{ strong: "strong", semi: "semi-strong", weak: "weak" }[strength]}`,
};

const DYNAMIC_TEXT: Record<string, string> = { cresc: "cresc.", decresc: "decresc." };

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
      <span className="cd-chord">
        <span>{`R[ ${notes.join(" ")} ]`}</span>
      </span>
    );
  }
  if (item.type !== "chord") {
    const [glyph, words] = {
      "no-chord": ["N.C.", labels.noChord],
      "repeat-bar": ["%", labels.repeatBar],
      tie: ["⁀", labels.tie],
    }[item.type];
    return (
      <span className="cd-chord">
        <span aria-hidden="true">{glyph}</span>
        <span className="cd-visually-hidden">{words}</span>
      </span>
    );
  }

  const { root, quality, bass } = formatter.chord(item, row);
  // Number style shows minor as "-": the minus is raised at half size (6⁻), the rest stays inline.
  const minor = quality.startsWith("-");
  const words = [
    item.push && labels.push,
    item.hold && labels.hold,
    item.stab && labels.stab,
    item.fermata && labels.fermata,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <span
      className={item.hold ? "cd-chord cd-chord--hold" : "cd-chord"}
      style={{ flexGrow: item.beats }}
    >
      {item.push && (
        <span className="cd-chord__push" aria-hidden="true">
          ‹
        </span>
      )}
      {(item.stab || item.fermata) && (
        <span className="cd-chord__mark" aria-hidden="true">
          {item.stab ? "^" : ""}
          {item.fermata ? "⌒" : ""}
        </span>
      )}
      {root}
      {minor && <span className="cd-chord__minor">-</span>}
      {minor ? quality.slice(1) : quality}
      {bass !== undefined && `/${bass}`}
      {words && <span className="cd-visually-hidden"> ({words})</span>}
    </span>
  );
}

export interface BarProps {
  bar: BarData;
  row: Row;
  formatter: ChordFormatter;
  size?: BarSize;
  labels?: BarLabels;
}

/** One bar (Design Handoff 3): chords sharing it by beats, its dynamic, cues, marks and landmark. */
export function Bar({ bar, row, formatter, size = "xl", labels = DEFAULT_BAR_LABELS }: BarProps) {
  const classes = [
    "cd-bar",
    `cd-bar--${size}`,
    bar.repeatStart && "cd-bar--repeat-start",
    bar.repeatEnd && "cd-bar--repeat-end",
    bar.ending && "cd-bar--ending",
  ]
    .filter(Boolean)
    .join(" ");
  const showTop = bar.ending || bar.dynamic || bar.cues.length > 0 || bar.repeatEnd;
  return (
    <div className={classes}>
      {showTop && (
        <div className="cd-bar__top">
          {bar.ending && <span className="cd-bar__ending">{bar.ending.join(", ")}.</span>}
          {bar.dynamic && (
            <span className="cd-bar__dynamic">{DYNAMIC_TEXT[bar.dynamic] ?? bar.dynamic}</span>
          )}
          {bar.cues.map((cue, index) => (
            <span key={index} className="cd-bar__cue">
              {!cue.roles.includes("everyone") && (
                <span className="cd-bar__cue-instrument">
                  {cue.roles.map(labels.instrument).join(", ")}
                </span>
              )}
              {cue.text}
            </span>
          ))}
          {bar.repeatEnd && <span className="cd-bar__times">×{bar.repeatEnd.times}</span>}
        </div>
      )}
      <div className="cd-bar__chords">
        {bar.items.map((item, index) => (
          <Item key={index} item={item} row={row} formatter={formatter} labels={labels} />
        ))}
      </div>
      {bar.lyric !== undefined && <div className="cd-bar__lyric">“{bar.lyric}”</div>}
    </div>
  );
}

export interface BarRowProps {
  row: Row;
  formatter: ChordFormatter;
  size?: BarSize;
  labels?: BarLabels;
}

/** One written row of bars, shown as one screen row; rows of up to four bars keep four columns. */
export function BarRow({ row, formatter, size = "xl", labels }: BarRowProps) {
  return (
    <div
      className={`cd-row cd-row--${size}`}
      style={{ gridTemplateColumns: `repeat(${Math.max(4, row.bars.length)}, minmax(0, 1fr))` }}
    >
      {row.bars.map((bar, index) => (
        <Bar
          key={index}
          bar={bar}
          row={row}
          formatter={formatter}
          size={size}
          {...(labels ? { labels } : {})}
        />
      ))}
    </div>
  );
}
