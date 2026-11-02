"use client";

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import { VStack } from "@astryxdesign/core/VStack";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { AddIcon } from "../../_components/ActionIcons";

const SOURCES = [
  { value: "all", label: "All sources" },
  { value: "studio", label: "Studio recording" },
  { value: "live", label: "Live" },
  { value: "acoustic", label: "Acoustic" },
  { value: "own_arrangement", label: "Own arrangement" },
];

interface Version {
  key: string;
  meter: string;
  tempo: number;
  source: string;
  by: string;
}

interface Song {
  title: string;
  versions: Version[];
}

// Harbor Lights is the chart from the owner's screenshot. The other keys are stand-ins, so two
// songs with the same name can be told apart.
const SONGS: Song[] = [
  {
    title: "Harbor Lights",
    versions: [{ key: "A", meter: "4/4", tempo: 92, source: "live", by: "Sam Rivera" }],
  },
  {
    title: "Hermosa te Amo",
    versions: [{ key: "D", meter: "4/4", tempo: 68, source: "live", by: "Example" }],
  },
  {
    title: "Hermosa Te Amo",
    versions: [{ key: "G", meter: "6/8", tempo: 72, source: "studio", by: "Example" }],
  },
  {
    title: "I Speak Jesus",
    versions: [{ key: "E", meter: "4/4", tempo: 70, source: "live", by: "Charity Gale" }],
  },
  {
    title: "King Of My Heart",
    versions: [
      { key: "A", meter: "4/4", tempo: 74, source: "live", by: "Bethel Music" },
      { key: "G", meter: "4/4", tempo: 76, source: "studio", by: "Bethel Music" },
      { key: "E", meter: "4/4", tempo: 80, source: "acoustic", by: "Bethel Music" },
    ],
  },
];

const sourceLabel = (value: string) => SOURCES.find((source) => source.value === value)?.label ?? value;

const played = (version: Version) =>
  `Key ${version.key} · ${version.meter} · Tempo ${version.tempo} · ${sourceLabel(version.source)} · by ${version.by}`;

/**
 * The catalog proposal (owner's review, November 1, 2026): one column, a playable line on every
 * one-version song, and a song with several versions opening under it, indented, with the tree's
 * own chevron. The row is the way in. Fork is on the song, after it has been opened. Astryx only.
 */
export function CatalogProposal() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const needle = query.trim().toLowerCase();
  const items = useMemo<TreeListItemData[]>(() => {
    return SONGS.map((song) => ({
      ...song,
      versions: song.versions.filter((version) => source === "all" || version.source === source),
    }))
      .filter(
        (song) =>
          song.versions.length > 0 && (needle === "" || song.title.toLowerCase().includes(needle)),
      )
      .map((song) => {
        const several = song.versions.length > 1;
        const item: TreeListItemData = {
          id: song.title,
          label: song.title,
          description: several ? `${song.versions.length} versions` : played(song.versions[0]!),
        };
        if (several) {
          item.children = song.versions.map((version) => ({
            id: `${song.title}-${version.key}-${version.source}`,
            label: (
              <Text type="supporting" color="primary" weight="medium">
                {`Key ${version.key} · ${version.meter} · Tempo ${version.tempo}`}
              </Text>
            ),
            description: `${sourceLabel(version.source)} · by ${version.by}`,
            onClick: () => undefined,
          }));
        } else {
          item.onClick = () => undefined;
        }
        return item;
      });
  }, [needle, source]);

  return (
    <Layout
      height="auto"
      padding={8}
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">Community</Text>
              <Heading level={1}>Songs</Heading>
              <Text color="secondary">
                Public ChartDown versions shared by the community. Free to use, fork and play.
              </Text>
            </VStack>
            <HStack gap={2} vAlign="center">
              <TextInput
                label="Search by title, artist or source"
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
            <TabList value={source} onChange={setSource} hasDivider>
              {SOURCES.map((option) => (
                <Tab key={option.value} value={option.value} label={option.label} />
              ))}
            </TabList>
            <TreeList density="spacious" variant="noGuides" items={items} />
            <Text type="supporting" color="secondary">
              Search sits with New version, and the sources are a line of text. A row highlights
              when the pointer is over it. A song with one version opens from the row. A song with
              several versions shows the tree chevron, set in from the row, and its versions
              sit indented under it, in the smaller text. Open and Fork are not on this list. Fork is on the song, after
              it has been opened. Harbor Lights is the chart from the screenshot. Every other key,
              meter and tempo is a stand-in.
            </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
