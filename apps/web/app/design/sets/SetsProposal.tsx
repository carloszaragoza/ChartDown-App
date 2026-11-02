"use client";

import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

type Kind = "rehearsal" | "service" | "concert";
type When = "upcoming" | "past";

interface SetRow {
  id: string;
  name: string;
  band: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm, when the set has a call time. */
  time?: string;
  type: Kind;
}

// The service on November 1 is the set from the owner's screenshot. The other two are stand-ins,
// so Past has something to show.
const SETS: SetRow[] = [
  { id: "today", name: "11/1/2026", band: "LifeStone Church", date: "2026-11-01", type: "service" },
  {
    id: "rehearsal",
    name: "10/25/2026",
    band: "LifeStone Church",
    date: "2026-10-25",
    time: "18:00",
    type: "rehearsal",
  },
  { id: "youth", name: "Youth night", band: "LifeStone Church", date: "2026-10-18", type: "service" },
];

const TYPE_LABEL: Record<Kind, string> = {
  rehearsal: "Rehearsal",
  service: "Service",
  concert: "Concert",
};

const localISO = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const medium = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(year!, month! - 1, day),
  );
};

const clock = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(2026, 0, 1, hour, minute),
  );
};

/** A stored name that is only the set's date, as "11/1/2026". */
const dateName = (name: string) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(name.trim());

const TODAY = localISO(new Date());

/** Band, then the type, then the day. A date already in the title is not written again. */
const descriptionOf = (set: SetRow) => {
  const parts = [set.band, TYPE_LABEL[set.type]];
  if (!dateName(set.name)) parts.push(set.date === TODAY ? "Today" : medium(set.date));
  else if (set.date === TODAY) parts.push("Today");
  if (set.time) parts.push(clock(set.time));
  return parts.join(" · ");
};

const matches = (set: SetRow, query: string) => {
  if (!query) return true;
  const haystack = [set.name, set.band, TYPE_LABEL[set.type], descriptionOf(set)]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
};

/**
 * The sets proposal (owner's review, November 1, 2026): the same list language as Songs.
 * Astryx only, and only the theme's colors. The real Sets page is unchanged.
 */
export function SetsProposal() {
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<When>("upcoming");
  const needle = query.trim().toLowerCase();
  const found = SETS.filter((set) => matches(set, needle));
  const upcoming = found.filter((set) => set.date >= TODAY);
  const past = found.filter((set) => set.date < TODAY);
  const shown = when === "past" ? past : upcoming;

  return (
    <Layout
      height="auto"
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Heading level={1}>Sets</Heading>
              <Text color="secondary">Upcoming and past sets from your bands.</Text>
            </VStack>
            <TextInput
              label="Search by name, band or type"
              isLabelHidden
              value={query}
              onChange={setQuery}
              placeholder="Search"
              startIcon={MagnifyingGlassIcon}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <TabList value={when} onChange={(value) => setWhen(value as When)} hasDivider>
              <Tab value="upcoming" label={`Upcoming (${upcoming.length})`} />
              <Tab value="past" label={`Past (${past.length})`} />
            </TabList>
            {shown.length === 0 ? (
              <EmptyState
                title={needle ? "No sets match" : when === "past" ? "No past sets" : "No upcoming sets"}
                description={
                  needle
                    ? "Try another word."
                    : "A set shows up here when it is on a band you are in. To create one, open the band."
                }
              />
            ) : (
              <List edge="outset" density="spacious">
                {shown.map((set) => (
                  <ListItem
                    key={set.id}
                    label={set.name}
                    description={descriptionOf(set)}
                    onClick={() => undefined}
                  />
                ))}
              </List>
            )}
            <Text type="supporting" color="secondary">
              The title and the rows share one edge. Search sits with the title, and Upcoming and
              Past are a line of text. The rows have no rules between them, and a row highlights
              when the pointer is over it, in Upcoming and in Past, because the row opens the
              set. LifeStone Church's
              service keeps the name 11/1/2026, and the line under it says the band, Service and
              Today. The rehearsal and Youth night are stand-ins. The Sets page itself is unchanged.
            </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
