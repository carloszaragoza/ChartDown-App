"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { useState, useSyncExternalStore } from "react";
import { Banner } from "../../_components/Banner";
import { AddIcon, GoIcon, StandIcon, VersionIcon } from "../../_components/ActionIcons";
import { PageLayout } from "../../_components/PageLayout";
import { Greeting } from "../../_home/HomeClient";

type Sample = "home" | "service" | "usage";
type Period = "7" | "30" | "all";

// Stand-ins, so the next service and a report with numbers can be seen. Not LifeStone's calendar,
// and not this account's charts. Morning Light, Open Road and Harbor Lights are original songs.
const PLAYED = [
  { id: "morning-light", title: "Morning Light", source: "Live", sets: 2, players: 6 },
  { id: "open-road", title: "Open Road", source: "Live", sets: 1, players: 3 },
  { id: "harbor-lights", title: "Harbor Lights", source: "Live", sets: 1, players: 2 },
] as const;

const noChange = () => () => undefined;

const dateLine = () =>
  new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date());

/**
 * The home proposal (owner's review, November 2, 2026): a musician's first screen.
 * Astryx only. The real Home is unchanged. "No service" uses this account's counts.
 */
export function HomeProposal() {
  const [sample, setSample] = useState<Sample>("home");
  const [period, setPeriod] = useState<Period>("30");
  const today = useSyncExternalStore(noChange, dateLine, () => "Monday, November 2, 2026");
  const hasService = sample === "service";
  const hasUsage = sample === "usage";
  const top = Math.max(...PLAYED.map((row) => row.players));

  const stat = (name: string, value: number, hint: string, href: string) => (
    <ClickableCard label={hint ? `${name}: ${value}. ${hint}` : `${name}: ${value}`} href={href}>
      <VStack gap={1}>
        <Text type="supporting">{name}</Text>
        <Text size="3xl" weight="bold">
          {value}
        </Text>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting">{hint}</Text>
          <GoIcon />
        </HStack>
      </VStack>
    </ClickableCard>
  );

  const header = (
    <LayoutHeader hasDivider>
      <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
        <VStack gap={1}>
          <Text type="supporting">{today}</Text>
          <Heading level={1}>
            <Greeting
              words={{
                hello: "Hello, Carlos",
                morning: "Good morning, Carlos",
                afternoon: "Good afternoon, Carlos",
                evening: "Good evening, Carlos",
              }}
            />
          </Heading>
          <Text color="secondary">Music director of LifeStone Church</Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          {hasService && <Button label="Create set" href="/sets" icon={<AddIcon />} />}
          <Button label="New version" href="/versions/new" icon={<VersionIcon />} />
        </HStack>
      </HStack>
    </LayoutHeader>
  );

  const nextUp = hasService ? (
    <Card>
      <section aria-labelledby="next-up">
        <VStack gap={3}>
          <Text type="supporting">Next up · Sunday, November 8</Text>
          <Heading level={2} id="next-up">
            Sunday service
          </Heading>
          <Text color="secondary">
            LifeStone Church · Service · Sunday, November 8, 2026 · 3 songs
          </Text>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Token label="Morning Light in E" size="sm" />
            <Token label="Open Road in G" size="sm" />
            <Text type="supporting">+1 more</Text>
          </HStack>
          <HStack gap={2} wrap="wrap">
            <Button label="Start stand mode" variant="primary" href="/stand" icon={<StandIcon />} />
            <Button label="Open set" href="/sets" />
          </HStack>
        </VStack>
      </section>
    </Card>
  ) : (
    <EmptyState
      headingLevel={2}
      title="No upcoming sets"
      description="LifeStone Church has nothing on the calendar. Create the next service, or look through every set."
      actions={
        <HStack gap={2} wrap="wrap" hAlign="center">
          <Button label="Create set" variant="primary" href="/sets" icon={<AddIcon />} />
          <Button label="See all sets" href="/sets" />
        </HStack>
      }
    />
  );

  const usage = hasUsage ? (
    <section aria-labelledby="usage">
      <VStack gap={3}>
        <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
          <VStack gap={0.5}>
            <Heading level={2} id="usage">
              How your versions are used
            </Heading>
            <Text type="supporting">
              6 musicians in 2 bands played your public versions · last {period === "all" ? "all time" : `${period} days`}
            </Text>
          </VStack>
          <SegmentedControl label="Period" value={period} onChange={(value) => setPeriod(value as Period)}>
            <SegmentedControlItem value="7" label="7 days" />
            <SegmentedControlItem value="30" label="30 days" />
            <SegmentedControlItem value="all" label="All time" />
          </SegmentedControl>
        </HStack>
        <Table density="spacious" hasHover>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Chart</TableHeaderCell>
              <TableHeaderCell>In sets</TableHeaderCell>
              <TableHeaderCell>Players</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PLAYED.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <VStack gap={0.5}>
                    <Link href={`#${row.id}`}>
                      <Text weight="semibold">{row.title}</Text>
                    </Link>
                    <Text type="supporting">{row.source}</Text>
                  </VStack>
                </TableCell>
                <TableCell>{row.sets}</TableCell>
                <TableCell>
                  <HStack gap={2} vAlign="center">
                    <Text>{row.players}</Text>
                    <ProgressBar
                      label={`How ${row.title} compares with your most played version`}
                      isLabelHidden
                      value={row.players}
                      max={top}
                      variant="neutral"
                    />
                  </HStack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting">Totals only. You never see which bands or musicians they are.</Text>
          <Button label="Chart editor" variant="ghost" href="/versions/mine" />
        </HStack>
      </VStack>
    </section>
  ) : (
    <section aria-labelledby="usage">
      <VStack gap={1}>
        <Heading level={2} id="usage">
          How your versions are used
        </Heading>
        <Text color="secondary">No band has played your public versions in the last 30 days yet.</Text>
        <Text type="supporting">Totals only. You never see which bands or musicians they are.</Text>
      </VStack>
    </section>
  );

  const content = (
    <VStack gap={5}>
      <TabList value={sample} onChange={(value) => setSample(value as Sample)}>
        <Tab value="home" label="No service" />
        <Tab value="service" label="Next service" />
        <Tab value="usage" label="Charts in use" />
      </TabList>
      {nextUp}
      <Grid columns={{ minWidth: 160 }} gap={3}>
        {stat("Bands", 2, "Including your personal space", "/bands")}
        {stat(
          "Upcoming sets",
          hasService ? 1 : 0,
          hasService ? "Next: Sunday" : "None yet",
          "/sets",
        )}
        {stat("My versions", 15, "Charts you can edit", "/versions/mine")}
        {stat("Musicians", 2, "In your band", "/bands")}
      </Grid>
      {usage}
      <Text type="supporting" color="secondary">
        No service is this account today: 2 bands, no upcoming set, 15 versions, and nobody has
        played them. Create set is filled only then, and it is said once. With a service, Start
        stand mode is the filled button. A report of zeros is the sentence, with no table and no
        period control. The table's columns are Chart, In sets and Players, and a title opens that
        chart. Sunday service, Morning Light, Open Road and Harbor Lights are stand-ins. The Home
        page itself is unchanged.
      </Text>
    </VStack>
  );

  const panel = (
    <VStack gap={6}>
      <section aria-labelledby="your-band">
        <VStack gap={2}>
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <Heading level={2} id="your-band">
              Your band
            </Heading>
            <Button label="Manage" variant="ghost" href="/bands" />
          </HStack>
          <Text type="supporting">LifeStone Church · 2 musicians</Text>
          <List hasDividers edge="outset">
            <ListItem
              startContent={<Avatar name="Carlos Zaragoza" size="sm" tooltip={false} />}
              label="Carlos Zaragoza (you)"
              description="Music director"
            />
            <ListItem
              startContent={<Avatar name="Bruno Sosa" size="sm" tooltip={false} />}
              label="Bruno Sosa"
            />
          </List>
        </VStack>
      </section>
      <section aria-labelledby="your-instruments">
        <VStack gap={2}>
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <Heading level={2} id="your-instruments">
              Your instruments
            </Heading>
            <Button label="Edit" href="/profile" />
          </HStack>
          <Banner
            status="warning"
            title="No instrument yet"
            description="Choose the instruments you play. Notes for those instruments reach you, and the ones you write reach your band."
          />
        </VStack>
      </section>
    </VStack>
  );

  return (
    <PageLayout
      phone={false}
      height="auto"
      padding={8}
      header={header}
      panel={{ side: "end", width: 340, label: "For you", children: panel }}
      content={content}
    />
  );
}
