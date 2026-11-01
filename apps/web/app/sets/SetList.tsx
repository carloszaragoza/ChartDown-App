import { EmptyState } from "@astryxdesign/core/EmptyState";
import { List } from "@astryxdesign/core/List";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { getFormatter, getTranslations } from "next-intl/server";
import { localToday } from "../../lib/sets/today";
import { compareSets, setWhen } from "../../lib/sets/when";
import { LinkRow } from "../_components/LinkRow";
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
  const today = await localToday();
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
          <List hasDividers edge="outset">
            {shown.map((set) => (
              // The whole row opens the set, as every list's rows do (T-3035).
              <LinkRow
                key={set.id}
                href={`/sets/${set.id}`}
                title={set.name}
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
