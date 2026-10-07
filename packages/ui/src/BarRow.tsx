import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import type { Bar as BarData, BarItem, ChordFormatter, Row } from "chartdown";
import { DEFAULT_BAR_LABELS, type BarLabels } from "./Bar";

const DYNAMIC_TEXT: Record<string, string> = { cresc: "cresc.", decresc: "decresc." };

// Bar lines are the chart's own drawing (Design Handoff 2.0, section 3), made from theme tokens:
// three border widths in the primary text color, two in the emphasized border color when small.
const line = (small: boolean) =>
  small
    ? "calc(var(--border-width) * 2) solid var(--color-border-emphasized)"
    : "calc(var(--border-width) * 3) solid var(--color-text-primary)";

function Chord({
  item,
  row,
  formatter,
  labels,
  small,
}: {
  item: BarItem;
  row: Row;
  formatter: ChordFormatter;
  labels: BarLabels;
  small: boolean;
}) {
  const size = small ? "2xl" : "4xl";
  const color = small ? "secondary" : "primary";
  if (item.type !== "chord") {
    const [glyph, words] = {
      "no-chord": ["N.C.", labels.noChord],
      "repeat-bar": ["%", labels.repeatBar],
      tie: ["⁀", labels.tie],
    }[item.type];
    return (
      <Text size={size} weight="semibold" color={color}>
        <span aria-hidden="true">{glyph}</span>
        <span className="cd-visually-hidden">{words}</span>
      </Text>
    );
  }
  const { root, quality, bass } = formatter.chord(item, row);
  const marks = [
    item.push && labels.push,
    item.hold && labels.hold,
    item.stab && labels.stab,
    item.fermata && labels.fermata,
  ].filter(Boolean);
  return (
    <span style={{ flexGrow: item.beats, textAlign: "center" }}>
      <Text size={size} weight="semibold" color={color} hasTabularNumbers>
        {item.push && <span aria-hidden="true">‹</span>}
        {root}
        {quality && (
          <sup style={{ fontSize: "0.5em", marginInlineStart: "var(--spacing-0-5)" }}>
            {quality}
          </sup>
        )}
        {bass && `/${bass}`}
        {(item.stab || item.fermata) && (
          <sup aria-hidden="true" style={{ fontSize: "0.5em" }}>
            {item.stab ? "^" : ""}
            {item.fermata ? "⌒" : ""}
          </sup>
        )}
        {marks.length > 0 && <span className="cd-visually-hidden">{` (${marks.join(", ")})`}</span>}
      </Text>
    </span>
  );
}

function OneBar({
  bar,
  row,
  first,
  small,
  formatter,
  labels,
}: {
  bar: BarData;
  row: Row;
  first: boolean;
  small: boolean;
  formatter: ChordFormatter;
  labels: BarLabels;
}) {
  return (
    // Each bar spans three lines shared by the whole row (marks, chords, lyric) through a
    // subgrid, so a bar with a dynamic, a cue or ×2 never pushes its chords off the row's line.
    <div
      role="group"
      style={{
        display: "grid",
        gridRow: "span 3",
        gridTemplateRows: "subgrid",
        rowGap: "var(--spacing-1)",
        alignContent: "center",
        minHeight: small ? "var(--spacing-12)" : "calc(var(--spacing-12) * 2)",
        borderInlineEnd: line(small),
        ...(first || bar.repeatStart ? { borderInlineStart: line(small) } : {}),
        paddingInline: "var(--spacing-2)",
        paddingBlock: "var(--spacing-1)",
      }}
    >
      <HStack gap={2} vAlign="center">
        {bar.ending && <Text type="supporting">{bar.ending.join(", ")}.</Text>}
        {bar.dynamic && (
          <Text type="supporting" weight="bold" color="accent">
            <i>{DYNAMIC_TEXT[bar.dynamic] ?? bar.dynamic}</i>
          </Text>
        )}
        {bar.cues.map((cue, index) => (
          <Text key={index} type="supporting">
            {!cue.roles.includes("everyone") && (
              <strong style={{ color: "var(--color-text-red)" }}>
                {cue.roles.map(labels.instrument).join(", ")}{" "}
              </strong>
            )}
            {cue.text}
          </Text>
        ))}
        {bar.repeatEnd && <Text type="supporting">×{bar.repeatEnd.times}</Text>}
      </HStack>
      <HStack gap={2} vAlign="center" hAlign="around" width="100%">
        {bar.items.map((item, index) => (
          <Chord
            key={index}
            item={item}
            row={row}
            formatter={formatter}
            labels={labels}
            small={small}
          />
        ))}
      </HStack>
      <div>{bar.lyric !== undefined && <Text type="supporting">“{bar.lyric}”</Text>}</div>
    </div>
  );
}

export interface BarRowProps {
  /** A row of a chart, from the `chartdown` tree. */
  row: Row;
  formatter: ChordFormatter;
  labels?: BarLabels;
  /** "sm" is the next-section preview: smaller, in the secondary color. */
  size?: "lg" | "sm";
}

/**
 * A row of bars (Design Handoff 2.0, section 3): square bar lines, chord numbers in large tabular
 * figures, quality marks as superscripts, dynamics in the accent color. Four bars per row.
 */
export function BarRow({ row, formatter, labels = DEFAULT_BAR_LABELS, size = "lg" }: BarRowProps) {
  const small = size === "sm";
  return (
    <Grid columns={Math.max(4, row.bars.length)} gap={0}>
      {row.bars.map((bar, index) => (
        <OneBar
          key={index}
          bar={bar}
          row={row}
          first={index === 0}
          small={small}
          formatter={formatter}
          labels={labels}
        />
      ))}
    </Grid>
  );
}
