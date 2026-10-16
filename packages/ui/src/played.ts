import { sectionLength, type Section, type SectionLength } from "chartdown";

/**
 * How long a section plays, counting a copy played more than once (`@use Chorus 3x`, ChartDown
 * 0.8, R-00.17): the same bars per pass, played that many more times.
 */
export function playedLength(section: Section): SectionLength {
  const length = sectionLength(section);
  const copies = section.use?.times ?? 1;
  if (copies < 2) return length;
  return { perPass: length.perPass, times: length.times * copies, total: length.total * copies };
}
