"use client";

import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { AddIcon } from "../../_components/ActionIcons";

interface Song {
  title: string;
  artists: string;
  /** Stand-in, so the line can show the album. Not loaded from the database. */
  album: string;
  /** Stand-in, so the line can show the year. Not loaded from the database. */
  year: string;
}

// Titles and artists from the owner's New version screenshot. Album and year are stand-ins.
const SONGS: Song[] = [
  { title: "A Great Awakening", artists: "Alexander Pappas, Lachlan Holmes", album: "Awake", year: "2019" },
  { title: "Good Good Father", artists: "Housefires, Pat Barrett", album: "Housefires II", year: "2014" },
  { title: "Good Plans / Doxology", artists: "Red Rocks Worship", album: "Spark", year: "2021" },
  { title: "How Awesome", artists: "The Belonging Co, Hope Darst", album: "All The Earth", year: "2019" },
  { title: "King Of My Heart", artists: "Bethel Music", album: "Starlight", year: "2017" },
  { title: "Name Above All Names", artists: "Charity Gayle", album: "Endless Praise", year: "2021" },
  {
    title: "One And Only (TAYA)",
    artists: "Cody Carnes, Jessie Early, Taya Gaukrodger",
    album: "God Is Good",
    year: "2022",
  },
  { title: "Reasons", artists: "Mitch Wong, The Belonging Co", album: "A Thousand More", year: "2022" },
  { title: "We Praise You", artists: "Brandon Lake", album: "House of Miracles", year: "2020" },
];

/**
 * The new-version proposal (owner's review, November 1, 2026): the same list as Songs.
 * Astryx only. The real New version page is unchanged.
 */
export function NewVersionProposal() {
  const [query, setQuery] = useState("a");
  const [chosen, setChosen] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const songs = SONGS.filter((song) =>
    needle ? `${song.title} ${song.artists} ${song.album} ${song.year}`.toLowerCase().includes(needle) : false,
  );

  return (
    <Layout
      height="auto"
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Breadcrumbs variant="supporting">
                <BreadcrumbItem href="/design/catalog">Songs</BreadcrumbItem>
                <BreadcrumbItem>New version</BreadcrumbItem>
              </Breadcrumbs>
              <Heading level={1}>New version</Heading>
              <Text color="secondary">Search for the song, or start a new one.</Text>
            </VStack>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <TextInput
                label="Find the song by title"
                isLabelHidden
                value={query}
                onChange={setQuery}
                placeholder="Search"
                startIcon={MagnifyingGlassIcon}
              />
              <Button label="Import a chord sheet">Import a chord sheet</Button>
              <Button label="Create a new song" variant="primary" icon={<AddIcon />}>
                Create a new song
              </Button>
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {needle && songs.length === 0 ? (
              <EmptyState
                title="No songs match"
                description="Create it as a new song. The title you typed comes with you."
              />
            ) : (
              songs.length > 0 && (
                <VStack gap={3}>
                  <Text color="secondary">
                    {songs.length} {songs.length === 1 ? "song matches" : "songs match"} “{query.trim()}”
                  </Text>
                  <List edge="outset" density="spacious">
                    {songs.map((song) => (
                      <ListItem
                        key={song.title}
                        label={song.title}
                        description={`${song.artists} · ${song.album} · ${song.year}`}
                        isSelected={chosen === song.title}
                        onClick={() => setChosen(song.title)}
                      />
                    ))}
                  </List>
                </VStack>
              )
            )}
            <Text type="supporting" color="secondary">
              Proposal, in the same list as Songs. The field filters as you type, beside the title,
              with no Search button. The rows share the title’s edge and have no rules. The row is
              the choice: there is no Use button repeated down the list. The line under the title
              is the artists, the album and the year. Album and year are stand-ins, so the line can
              be seen; they are not loaded from the database. Create a new song stays the only
              filled button. The New version page itself is unchanged.
            </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
