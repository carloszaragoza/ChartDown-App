// The invite code form (R-01.7): single use, or a band code with a number of uses or no limit.

export interface InviteFields {
  kind: "single_use" | "band";
  max_uses: number | null;
  note: string | null;
}
export type InviteProblem = "uses" | "note";

/** The new code's kind, limit and note, or what is wrong with them. */
export function readInvite(form: {
  kind: unknown;
  max_uses: unknown;
  note: unknown;
}): { fields: InviteFields } | { problem: InviteProblem } {
  const note = String(form.note ?? "").trim();
  if (note.length > 200) return { problem: "note" };
  if (form.kind !== "band")
    return { fields: { kind: "single_use", max_uses: 1, note: note || null } };
  const text = String(form.max_uses ?? "").trim();
  if (text === "") return { fields: { kind: "band", max_uses: null, note: note || null } };
  const uses = Number(text);
  if (!Number.isInteger(uses) || uses < 1 || uses > 10000) return { problem: "uses" };
  return { fields: { kind: "band", max_uses: uses, note: note || null } };
}
