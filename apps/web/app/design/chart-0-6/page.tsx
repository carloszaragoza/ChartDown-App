import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { readBeatsMode } from "@chartdown/ui";
import { parse } from "chartdown";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BeatsControl } from "../../_components/BeatsControl";
import { ChartPreview } from "../../_components/ChartPreview";
import { NORTHBOUND, SYNTAX_TOUR } from "./charts";

// Review page for how the viewer draws ChartDown 0.5 and 0.6 (design/chart-viewer section 10,
// T-1706): the Syntax Tour and Northbound of the Language repository, as numbers.
// Development and preview builds only.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ChartZeroSixPage({
  searchParams,
}: {
  searchParams: Promise<{ beats?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const beats = readBeatsMode((await searchParams).beats);
  const at = (mode: string) =>
    mode === "auto" ? "/design/chart-0-6" : `/design/chart-0-6?beats=${mode}`;
  return (
    <Layout padding={8}>
      <LayoutContent>
        <VStack gap={8}>
          <VStack gap={2}>
            <Heading level={1}>ChartDown 0.6</Heading>
            <Text type="supporting">
              Northbound and the Syntax Tour, drawn by the viewer (design/chart-viewer, sections 5
              and 10). Beats: Off, Auto or Always.
            </Text>
          </VStack>
          <BeatsControl
            value={beats}
            hrefs={{ off: at("off"), auto: at("auto"), always: at("always") }}
            words={{
              label: "Beats",
              name: "Beat slashes",
              off: "Off",
              auto: "Auto",
              always: "Always",
            }}
          />
          <ChartPreview chart={parse(NORTHBOUND)} hasForm beats={beats} />
          <ChartPreview chart={parse(SYNTAX_TOUR)} beats={beats} />
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
