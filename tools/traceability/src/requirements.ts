const REQUIREMENT = /R-(\d{2})\.(\d+)(?:\s+to\s+R-(\d{2})\.(\d+))?/g;

/** Every requirement id in a piece of text, with ranges such as "R-02.1 to R-02.3" expanded. */
export function extractRequirementIds(text: string): string[] {
  const ids: string[] = [];
  for (const [, spec, first, toSpec, last] of text.matchAll(REQUIREMENT)) {
    const start = Number(first);
    const end = toSpec === spec && last !== undefined ? Number(last) : start;
    for (let n = start; n <= end; n++) ids.push(`R-${spec}.${n}`);
    if (toSpec !== undefined && toSpec !== spec) ids.push(`R-${toSpec}.${last}`);
  }
  return [...new Set(ids)];
}

/** The requirement ids defined in the SDD plan: list items that start with "R-xx.y". */
export function parseDefinedRequirements(sddPlan: string): Set<string> {
  return new Set(Array.from(sddPlan.matchAll(/^- (R-\d{2}\.\d+)\b/gm), ([, id]) => id as string));
}
