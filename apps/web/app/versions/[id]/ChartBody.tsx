import { chordFormatter, type Chart } from "@chartdown/core";
import { FormStrip, formStripItems, Section, type FormStripItem } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { useChartLabels } from "../../_components/chartLabels";

/** A chart's FormStrip and sections in its written key, with no band's layer (R-06.5). */
export function ChartBody({ chart }: { chart: Chart }) {
  const c = useTranslations("chart");
  const labels = useChartLabels();
  const formatter = chordFormatter(chart, { style: "numbers" });
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
        />
      ))}
    </>
  );
}
