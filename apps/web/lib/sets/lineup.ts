import { parseKeyName, type Chart, type Key } from "@chartdown/core";

/**
 * What a member plays in a set (R-05.3): the set's own lineup when it has one, where no
 * instruments means they sit out; otherwise their default instruments in the band.
 */
export function effectiveLineup(
  members: { id: string; defaults: string[] }[],
  lineup: { member_id: string; instrument_id: string }[],
): Map<string, string[]> {
  const own = lineup.length > 0;
  return new Map(
    members.map((member) => [
      member.id,
      own
        ? lineup.filter((row) => row.member_id === member.id).map((row) => row.instrument_id)
        : member.defaults,
    ]),
  );
}

/** The key a set plays a song in (R-05.4): its set key if it fits the chart's mode, or as written. */
export function setSongKey(chart: Chart, setKey: string | null | undefined): Key {
  const key = setKey ? parseKeyName(setKey) : undefined;
  return key && key.minor === chart.key.minor ? key : chart.key;
}
