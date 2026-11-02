"use client";

import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { GlobeAltIcon, LockClosedIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { AddIcon } from "../../_components/ActionIcons";

type Visibility = "public" | "private";

interface Chart {
  title: string;
  /** When this chart was last edited, as the list shows it. */
  updated: string;
  visibility: Visibility;
  /** Stand-in. Not read from the chart. */
  songKey: string;
  meter: string;
  tempo: number;
  /** A row added so private has an icon to show. Not one of the owner's charts. */
  standIn?: boolean;
}

// The titles and dates are the charts from the owner's Chart editor screenshot. All of those
// are public. Every key, meter and tempo is a stand-in. Practice chart is a stand-in too, so
// the private icon has a row.
const CHARTS: Chart[] = [
  { title: "Name Above All Names", updated: "Oct 31, 2026", visibility: "public", songKey: "G", meter: "4/4", tempo: 72 },
  { title: "How Awesome", updated: "Oct 31, 2026", visibility: "public", songKey: "D", meter: "4/4", tempo: 68 },
  { title: "Reasons", updated: "Oct 30, 2026", visibility: "public", songKey: "A", meter: "6/8", tempo: 76 },
  { title: "One And Only (TAYA)", updated: "Oct 23, 2026", visibility: "public", songKey: "E", meter: "4/4", tempo: 70 },
  { title: "We Praise You", updated: "Oct 23, 2026", visibility: "public", songKey: "Bb", meter: "4/4", tempo: 74 },
  { title: "Jesus we love you", updated: "Oct 23, 2026", visibility: "public", songKey: "C", meter: "4/4", tempo: 80 },
  { title: "No One Else", updated: "Oct 17, 2026", visibility: "public", songKey: "F", meter: "3/4", tempo: 66 },
  { title: "The Blood", updated: "Oct 14, 2026", visibility: "public", songKey: "G", meter: "4/4", tempo: 78 },
  { title: "A Great Awakening", updated: "Oct 14, 2026", visibility: "public", songKey: "D", meter: "6/8", tempo: 64 },
  { title: "Good Plans / Doxology", updated: "Oct 8, 2026", visibility: "public", songKey: "A", meter: "4/4", tempo: 84 },
  { title: "Good Good Father", updated: "Oct 7, 2026", visibility: "public", songKey: "G", meter: "4/4", tempo: 73 },
  { title: "King Of My Heart", updated: "Oct 7, 2026", visibility: "public", songKey: "A", meter: "4/4", tempo: 74 },
  { title: "Center", updated: "Oct 7, 2026", visibility: "public", songKey: "E", meter: "4/4", tempo: 90 },
  { title: "Practice chart", updated: "Oct 1, 2026", visibility: "private", songKey: "C", meter: "4/4", tempo: 88, standIn: true },
];

const NAME: Record<Visibility, string> = { public: "Public", private: "Private" };

const played = (chart: Chart) =>
  `Key ${chart.songKey} · ${chart.meter} · Tempo ${chart.tempo} · Updated ${chart.updated}`;

/**
 * The Chart editor list (owner's review, November 1, 2026): the row edits the chart. The line is
 * the key, the meter, the tempo and the date. Public or private is an icon, named for the reader.
 * Director's notes stay in their own section. Astryx only.
 */
export function EditorProposal() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const charts = CHARTS.filter((chart) => needle === "" || chart.title.toLowerCase().includes(needle));

  return (
    <Layout
      height="auto"
      padding={8}
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Heading level={1}>Chart editor</Heading>
              <Text color="secondary">The charts you can edit.</Text>
            </VStack>
            <HStack gap={2} vAlign="center">
              <TextInput
                label="Search by title"
                isLabelHidden
                value={query}
                onChange={setQuery}
                placeholder="Search"
                startIcon={MagnifyingGlassIcon}
              />
              <Button label="New version" variant="primary" icon={<AddIcon />}>
                New version
              </Button>
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            {charts.length === 0 ? (
              <EmptyState title="No charts match" description="Try another word." />
            ) : (
              <List edge="outset" density="spacious">
                {charts.map((chart) => (
                  <ListItem
                    key={chart.title}
                    label={chart.title}
                    description={
                      <HStack gap={1} vAlign="center">
                        <Icon
                          icon={chart.visibility === "public" ? GlobeAltIcon : LockClosedIcon}
                          size="sm"
                          color="secondary"
                          label={NAME[chart.visibility]}
                          aria-hidden={false}
                        />
                        <Text type="supporting" color="secondary">
                          {played(chart)}
                        </Text>
                      </HStack>
                    }
                    onClick={() => undefined}
                  />
                ))}
              </List>
            )}
            <Text type="supporting" color="secondary">
              The row edits the chart, and it highlights when the pointer is over it. There is no
              Open, no Edit button and no Director's notes: those notes stay in Director's notes.
              Public and Private are an icon only: a globe or a lock, named for the reader, with no
              word repeated on the line. The line is the key, the meter, the tempo and the date.
              Every key, meter and tempo is a stand-in. Search sits with New version and filters as
              you type. Practice chart is a stand-in, so the lock has a row. The other titles and
              dates are from the Chart editor screenshot. The Your versions page itself is unchanged.
            </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
