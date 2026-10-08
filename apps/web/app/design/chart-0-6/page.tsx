import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { parse } from "chartdown";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartPreview } from "../../_components/ChartPreview";
import { NORTHBOUND, SYNTAX_TOUR } from "./charts";

// Review page for how the viewer draws ChartDown 0.5 and 0.6 (design/chart-viewer section 10,
// T-1706): the Syntax Tour and Northbound of the Language repository, as numbers.
// Development and preview builds only.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ChartZeroSixPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <Layout padding={8}>
      <LayoutContent>
        <VStack gap={8}>
          <VStack gap={2}>
            <Heading level={1}>ChartDown 0.6</Heading>
            <Text type="supporting">
              Northbound and the Syntax Tour, drawn by the viewer (design/chart-viewer, section 10).
            </Text>
          </VStack>
          <ChartPreview chart={parse(NORTHBOUND)} hasForm />
          <ChartPreview chart={parse(SYNTAX_TOUR)} />
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
