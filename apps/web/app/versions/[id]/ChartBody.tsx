import { chordFormatter, type Chart, type ChordStyle, type Key } from "@chartdown/core";
import {
  FormStrip,
  formStripItems,
  Section,
  type FormStripItem,
  type MDNoteData,
} from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { useChartLabels } from "../../_components/chartLabels";

/**
 * A chart's FormStrip and sections, as numbers or letters and in its written key unless another
 * is given (R-03.2), with no band's layer (R-06.5).
 */
export function ChartBody({
  chart,
  style = "numbers",
  homeKey,
  notes,
}: {
  chart: Chart;
  style?: ChordStyle;
  homeKey?: Key;
  /** The notes to show on each section, by its index; the chart's own by default. */
  notes?: (index: number) => readonly MDNoteData[];
}) {
  const c = useTranslations("chart");
  const labels = useChartLabels();
  const formatter = chordFormatter(chart, homeKey ? { style, key: homeKey } : { style });
  const describe = (item: FormStripItem) => `${item.name}, ${labels.length(item.length)}`;
  return (
    <>
      <FormStrip
        items={formStripItems(chart, -1, () => false)}
        labels={{ nav: c("songForm"), describe }}
      />
      {chart.sections.map((section, index) => (
        <Section
          key={index}
          section={section}
          formatter={formatter}
          labels={labels}
          size="md"
          id={`section-${index + 1}`}
          {...(notes ? { notes: notes(index) } : {})}
        />
      ))}
    </>
  );
}
