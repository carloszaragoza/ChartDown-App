// The landing's waitlist form, read and checked before it reaches the database (T-1310).

export type WaitlistSource = "hero" | "final_cta";
export type WaitlistRole = "music_director" | "musician" | "teacher";
export const ROLES: readonly WaitlistRole[] = ["music_director", "musician", "teacher"];

export interface WaitlistState {
  status: "idle" | "sent" | "invalid" | "error" | "unavailable";
  /** The email typed, kept when something went wrong. */
  email?: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The email (trimmed, lowercased, at most 254 characters), the role and the source. */
export function readWaitlist(
  form: FormData,
):
  | { status: "ok"; email: string; role: WaitlistRole | null; source: WaitlistSource; bot: boolean }
  | { status: "invalid" } {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { status: "invalid" };
  const role = String(form.get("role") ?? "");
  const source = form.get("source") === "final_cta" ? "final_cta" : "hero";
  return {
    status: "ok",
    email,
    role: (ROLES as readonly string[]).includes(role) ? (role as WaitlistRole) : null,
    source,
    // People never see this field; a bot fills every field it finds.
    bot: String(form.get("website") ?? "") !== "",
  };
}
