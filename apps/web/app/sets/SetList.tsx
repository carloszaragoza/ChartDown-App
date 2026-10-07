import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Item } from "@astryxdesign/core/Item";
import { List } from "@astryxdesign/core/List";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { compareSets, setWhen } from "../../lib/sets/when";
import { PageTabs } from "../_components/PageTabs";

export interface ListedSet {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  type: "rehearsal" | "service" | "concert";
  /** The band it belongs to, when the list mixes bands. */
  band?: string;
}

/**
 * Sets in two tabs that live in the address (Design Handoff 2.0 screen 10): upcoming, undated
 * ones last, and past, newest first. Past means dated before today (UTC).
 */
export async function SetList({
  sets,
  path,
  when,
}: {
  sets: ListedSet[];
  /** The page's address, for the tabs. */
  path: string;
  when: string | undefined;
}) {
  const t = await getTranslations("sets");
  const format = await getFormatter();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sets.filter((set) => !set.date || set.date >= today).sort(compareSets);
  const past = sets.filter((set) => set.date && set.date < today).sort((a, b) => compareSets(b, a));
  const showPast = when === "past";
  const shown = showPast ? past : upcoming;
  const label = showPast ? t("past") : t("upcoming");
  return (
    <VStack gap={4}>
      <PageTabs
        current={showPast ? "past" : "upcoming"}
        tabs={[
          { value: "upcoming", label: `${t("upcoming")} (${upcoming.length})`, href: path },
          { value: "past", label: `${t("past")} (${past.length})`, href: `${path}?when=past` },
        ]}
      />
      <section aria-label={label}>
        {shown.length === 0 ? (
          <EmptyState title={showPast ? t("noPast") : t("noUpcoming")} />
        ) : (
          <List hasDividers edgeCompensation="inline">
            {shown.map((set) => (
              <Item
                key={set.id}
                as="li"
                label={<Link href={`/sets/${set.id}`}>{set.name}</Link>}
                description={[set.band, setWhen(format, set.date, set.time) ?? t("noDate")]
                  .filter(Boolean)
                  .join(" · ")}
                endContent={<Token label={t(`types.${set.type}`)} size="sm" />}
              />
            ))}
          </List>
        )}
      </section>
    </VStack>
  );
}
