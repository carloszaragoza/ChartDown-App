// A notice as T-1001 makes it (Technical Plan 7): its type and what it said at the time.
export interface Notice {
  id: string;
  type: string;
  detail: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
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
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const textOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Where opening a notice takes the person: the set, or the song for a note. */
export function noticeHref(notice: Pick<Notice, "type" | "detail">): string {
  const { detail } = notice;
  if (notice.type === "note_added") return `/versions/${text(detail.version_id)}`;
  const set = text(detail.set_id);
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
    default:
      return null;
  }
}
