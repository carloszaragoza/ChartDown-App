// Stand mode with no set to open (R-05.7).
import { currentBand, type ShellBand } from "../shell/shell";

export interface StandBand extends ShellBand {
  role: "md" | "musician";
}

/**
 * Where Create a set leads, as Home's does: the current band's sets when the person directs it,
 * otherwise their personal space's; null for a person in no band yet, who only sees all sets.
 */
export function createSetHref(bands: readonly StandBand[], chosen: string | undefined) {
  if (!bands.some((band) => !band.personal)) return null;
  const current = currentBand(bands, chosen) as StandBand | null;
  if (current && !current.personal && current.role === "md") return `/bands/${current.id}/sets`;
  const personal = bands.find((band) => band.personal);
  return personal ? `/bands/${personal.id}/sets` : "/sets";
}
