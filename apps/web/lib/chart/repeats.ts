/**
 * Which time each section of a song's form is, among those with the same abbreviation: a song
 * that plays its bridge three times reads B1, B1², B1³ (Design Handoff 2.0, 1.5). A section that
 * is played once gets no number.
 */
export function repeats(abbreviations: readonly string[]): { time: number; of: number }[] {
  const totals = new Map<string, number>();
  for (const abbreviation of abbreviations)
    totals.set(abbreviation, (totals.get(abbreviation) ?? 0) + 1);
  const seen = new Map<string, number>();
  return abbreviations.map((abbreviation) => {
    const time = (seen.get(abbreviation) ?? 0) + 1;
    seen.set(abbreviation, time);
    return { time, of: totals.get(abbreviation) ?? 1 };
  });
}
