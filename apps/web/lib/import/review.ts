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
