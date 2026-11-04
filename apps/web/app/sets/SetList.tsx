import { EmptyState } from "@astryxdesign/core/EmptyState";
import { List } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/VStack";
import { getFormatter, getTranslations } from "next-intl/server";
import { localToday } from "../../lib/sets/today";
import { compareSets, setSummary } from "../../lib/sets/when";
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
 * Sets in two tabs that live in the address, filtered by name, band and type (Design Handoff 2.0 screen 10): upcoming, undated
 * ones last, and past, newest first. Past means dated before today (UTC).
 */
export async function SetList({
  sets,
  path,
  when,
  query = "",
  emptyHint,
}: {
  sets: ListedSet[];
  /** The page's address, for the tabs. */
  path: string;
  when: string | undefined;
  /** Narrows by name, band and type. Empty shows every set. */
  query?: string;
  /** Said only when that tab has no sets at all. */
  emptyHint?: string;
}) {
  const t = await getTranslations("sets");
  const format = await getFormatter();
  const today = await localToday();
  const words = { today: t("today"), noDate: t("noDate") };
  const needle = query.trim().toLowerCase();
  const matches = (set: ListedSet) => {
    if (!needle) return true;
    return [set.name, set.band, t(`types.${set.type}`)]
      .filter(Boolean)
      .join("\n")
      .toLowerCase()
      .includes(needle);
  };
  const upcomingAll = sets.filter((set) => !set.date || set.date >= today).sort(compareSets);
  const pastAll = sets
    .filter((set) => set.date && set.date < today)
    .sort((a, b) => compareSets(b, a));
  const upcoming = upcomingAll.filter(matches);
  const past = pastAll.filter(matches);
  const showPast = when === "past";
  const shown = showPast ? past : upcoming;
  const all = showPast ? pastAll : upcomingAll;
  const label = showPast ? t("past") : t("upcoming");
  const tabHref = (pastTab: boolean) => {
    const params = new URLSearchParams();
    if (pastTab) params.set("when", "past");
    if (query.trim()) params.set("q", query.trim());
    const text = params.toString();
    return text ? `${path}?${text}` : path;
  };
  return (
    <VStack gap={4}>
      <PageTabs
        current={showPast ? "past" : "upcoming"}
        // The same line of text as the catalog's sources, at its own width (T-3048).
        isFullBleed={false}
        tabs={[
          {
            value: "upcoming",
            label: `${t("upcoming")} (${upcoming.length})`,
            href: tabHref(false),
          },
          { value: "past", label: `${t("past")} (${past.length})`, href: tabHref(true) },
        ]}
      />
      <section aria-label={label}>
        {shown.length === 0 ? (
          <EmptyState
            title={needle && all.length > 0 ? t("none") : showPast ? t("noPast") : t("noUpcoming")}
            {...(all.length === 0 && emptyHint ? { description: emptyHint } : {})}
          />
        ) : (
          <List density="spacious" edge="outset">
            {shown.map((set) => (
              // The whole row opens the set, as every list's rows do (T-3035).
              <LinkRow
                key={set.id}
                href={`/sets/${set.id}`}
                title={set.name}
                description={setSummary(
                  format,
                  { ...set, type: t(`types.${set.type}`) },
                  today,
                  words,
                )}
              />
            ))}
          </List>
        )}
      </section>
    </VStack>
  );
}
