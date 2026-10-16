import type { ReviewItem } from "./convert";

export type { ReviewItem };

/** Every assumption grouped by kind: what to check, and on which lines of the draft. */
export function groupReview(
  review: ReviewItem[],
): { kind: ReviewItem["kind"]; lines: number[]; details: string[] }[] {
  const groups = new Map<ReviewItem["kind"], { lines: number[]; details: string[] }>();
  for (const item of review) {
    const group = groups.get(item.kind) ?? { lines: [], details: [] };
    if (item.line !== undefined) group.lines.push(item.line);
    if (item.detail !== undefined && !group.details.includes(item.detail))
      group.details.push(item.detail);
    groups.set(item.kind, group);
  }
  return [...groups].map(([kind, group]) => ({ kind, ...group }));
}

// What the parser says about the chart is shown live under it; the review keeps what only the
// import knows: its own assumptions.
const LIVE: readonly ReviewItem["kind"][] = ["unknown-chord", "chart-warning"];

/** The import's own assumptions, without what the parser reports live. */
export function importAssumptions(review: ReviewItem[]): ReviewItem[] {
  return review.filter((item) => !LIVE.includes(item.kind));
}

/** The lines the import asks to check, to mark beside the text. */
export function reviewLines(review: ReviewItem[]): { line: number; kind: "review" }[] {
  return importAssumptions(review).flatMap((item) =>
    item.line === undefined ? [] : [{ line: item.line, kind: "review" as const }],
  );
}
