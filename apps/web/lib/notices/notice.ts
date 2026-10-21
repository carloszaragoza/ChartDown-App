// A notice as T-1001 makes it (Technical Plan 7): its type and what it said at the time.
export interface Notice {
  id: string;
  type: string;
  detail: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

/** The kinds of notice T-1001 makes, in the order the profile offers them (R-09.5). */
export const NOTICE_TYPES = [
  "lineup_added",
  "lineup_removed",
  "temp_md",
  "key_changed",
  "order_changed",
  "note_added",
  "new_revision",
  "version_hidden",
  "live_started",
  "live_ended",
] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

/**
 * What saving the preferences changes (R-09.5): the kinds now turned off get an "off" row; the
 * kinds turned back on lose theirs, since no row means the notice is on.
 */
export function preferenceChanges(
  wanted: ReadonlySet<string>,
  off: ReadonlySet<string>,
): { turnOff: NoticeType[]; turnOn: NoticeType[] } {
  return {
    turnOff: NOTICE_TYPES.filter((type) => !wanted.has(type) && !off.has(type)),
    turnOn: NOTICE_TYPES.filter((type) => wanted.has(type) && off.has(type)),
  };
}

/** How a notice reads: a message under `notices.types` and its values. */
export interface NoticeMessage {
  key: string;
  values: Record<string, string | number>;
}

/** What the page supplies in the reader's language. */
export interface NoticeWords {
  instrument: (slug: string) => string;
  /** A set's date and time, or "no date". */
  when: (date: string | null, time: string | null) => string;
  /** A plain date, such as a temporary MD's last day. */
  day: (date: string) => string;
  /** The written key, when a set had none of its own. */
  writtenKey: string;
  /** Who a note without instruments is for. */
  everyone: string;
  /** Where a note is: its section, and its bar when it has one. */
  place: (section: string, bar: number | null) => string;
  /** Why the administrators hid a version (R-07.2). */
  reason: (reason: string) => string;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const textOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Where opening a notice takes the person: the set, or the song for a note. */
export function noticeHref(notice: Pick<Notice, "type" | "detail">): string {
  const { detail } = notice;
  if (notice.type === "note_added" || notice.type === "version_hidden")
    return `/versions/${text(detail.version_id)}`;
  const set = text(detail.set_id);
  // Live now opens the session, on the leader's song (R-12.2).
  if (notice.type === "live_started" && set) return `/sets/${set}/live`;
  return set ? `/sets/${set}` : "/notices";
}

/** What changed, in a sentence (R-09.3); null for a type this app does not know yet. */
export function noticeMessage(
  notice: Pick<Notice, "type" | "detail">,
  words: NoticeWords,
): NoticeMessage | null {
  const { detail } = notice;
  const set = text(detail.set_name);
  const title = text(detail.title);
  switch (notice.type) {
    case "lineup_added":
    case "lineup_removed":
      return {
        key: notice.type,
        values: {
          set,
          when: words.when(textOrNull(detail.date), textOrNull(detail.time)),
          instrument: words.instrument(text(detail.instrument)),
        },
      };
    case "temp_md": {
      const until = textOrNull(detail.until);
      return until
        ? { key: "temp_md", values: { set, until: words.day(until) } }
        : { key: "temp_md_open", values: { set } };
    }
    case "key_changed":
      return {
        key: "key_changed",
        values: {
          title,
          set,
          from: textOrNull(detail.old_key) ?? words.writtenKey,
          to: textOrNull(detail.new_key) ?? words.writtenKey,
        },
      };
    case "order_changed":
      return { key: "order_changed", values: { set } };
    case "note_added": {
      const instruments = Array.isArray(detail.instruments)
        ? detail.instruments.map((slug) => words.instrument(text(slug)))
        : [];
      return {
        key: "note_added",
        values: {
          title,
          place: words.place(
            text(detail.section),
            typeof detail.bar === "number" ? detail.bar : null,
          ),
          text: text(detail.text),
          for: instruments.length > 0 ? instruments.join(", ") : words.everyone,
        },
      };
    }
    case "new_revision":
      return {
        key: "new_revision",
        values: {
          title,
          set,
          number: Number(detail.number) || 0,
          pinned: Number(detail.pinned_number) || 0,
        },
      };
    case "version_hidden":
      return {
        key: "version_hidden",
        values: { title, reason: words.reason(text(detail.reason)) },
      };
    case "live_started":
      return { key: "live_started", values: { set, leader: text(detail.leader) } };
    case "live_ended":
      return { key: "live_ended", values: { set } };
    default:
      return null;
  }
}
