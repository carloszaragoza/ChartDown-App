import { chordFormatter, parse, parseLayer, placeLayer } from "chartdown";
import { FormStrip, formStripItems, NextSection, Section, type FormStripItem } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { useChartLabels } from "../_components/chartLabels";

// The approved "Atril" screen (ChartDown App – Pantallas, 2 and 3): Open Road, the original
// example song from the ChartDown Language repository, in A, Chorus 2 now, viewed as Keys,
// with one note from the band's MD layer.
const OPEN_ROAD = `---
chartdown: 0.4
title: Open Road
artists: ChartDown examples
key: G
tempo: 76
meter: 4/4
feel: Straight, building
---

// An original example song written for this repository.

## Intro
> MD: Light and airy. I'll count us in slow.
> MD keys: Pad swell, long notes.
> MD drums: Sit out until the chorus.
{pp} 6m 5 4 1 | 6m 5 4 1 | 6m 5 4 1 | 6m 5 4 1

## Verse 1
> MD: Intimate. Vocal front and center.
> MD gtr: Clean, light picking. Leave space.
{p} 1 "Morning on the" | 4 1 | 6m 5 | 4 1
1 "Every mile" | 4 1 | 6m 5 | 4 1

## Chorus
> MD: Open it up a little. Don't go all out yet.
> MD drums: Light groove, hi-hat or ride.
> MD bass: Root notes, long and warm.
{mf} 4 "Take the open road" {drums: in} | 1 | 5 | 6m
4 | 1 | 5sus 5 | 1

## Verse 2
> MD: Back down, a little warmer than verse 1.
@use Verse 1

## Chorus 2
> MD: A touch bigger. Harmonies on the second line.
@use Chorus

## Bridge
> MD: Strip it back, then build every pass. I'll cue the repeats.
> MD drums, bass: Out on the first pass, in on the second.
|: {p} 6m | 4 | 1 | [1] 5 :| x2
[2] 5 4 5 5 |

## Last Chorus
> MD: Up a whole step. Full band.
@key A
{f} 4 | 1 | 5 | 6m
4 | 1 | 5sus 5 | <1>~
`;
const LAYER = "## Chorus 2\n> MD keys: Move the pad up an octave. Right hand stays simple.";
const VIEW_AS = "keys";
const CURRENT = 4;

export function AtrilExample() {
  const t = useTranslations("chart");
  const chart = parse(OPEN_ROAD);
  const placement = placeLayer(chart, parseLayer(LAYER).layer);
  const formatter = chordFormatter(chart, { style: "numbers", key: { root: "A", minor: false } });

  // The per-instrument view (T-801, T-802) will do this on the server; here it is spelled out.
  const notesFor = (index: number) => [
    ...(chart.sections[index]?.notes ?? []).filter(
      (n) => n.roles.includes("everyone") || n.roles.includes(VIEW_AS),
    ),
    ...(placement.sections[index] ?? []).map((placed) => ({ md: true, ...placed.note })),
  ];
  const hasNotesForYou = (index: number) => notesFor(index).some((n) => n.roles.includes(VIEW_AS));
  const labels = useChartLabels();
  const length = labels.length;
  const describe = (item: FormStripItem) =>
    [
      item.name,
      length(item.length),
      item.state === "played" ? t("played") : item.state === "current" ? t("now") : "",
      item.hasNotes ? t("hasNotes") : "",
    ]
      .filter(Boolean)
      .join(", ");

  const current = chart.sections[CURRENT];
  const next = chart.sections[CURRENT + 1];
  const meta = { font: "var(--type-meta)", color: "var(--ink-muted)" } as const;
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "var(--space-2) var(--space-6)",
        }}
      >
        <h3 style={{ font: "var(--type-song-title)", margin: 0 }}>{chart.header.title}</h3>
        <span style={meta}>
          {t("key")} <b style={{ color: "var(--ink)" }}>A (1)</b> · {t("time")}{" "}
          <b style={{ color: "var(--ink)" }}>{chart.header.meter}</b> · {t("tempo")}{" "}
          <b style={{ color: "var(--ink)" }}>{chart.header.tempo}</b>
        </span>
      </div>
      <FormStrip
        items={formStripItems(chart, CURRENT, hasNotesForYou)}
        labels={{ nav: t("songForm"), describe }}
      />
      {current && (
        <Section
          section={current}
          formatter={formatter}
          labels={labels}
          notes={notesFor(CURRENT)}
          id="section-5"
        />
      )}
      {next && (
        <NextSection
          section={next}
          formatter={formatter}
          labels={labels}
          hasNotesForYou={hasNotesForYou(CURRENT + 1)}
        />
      )}
    </div>
  );
}
