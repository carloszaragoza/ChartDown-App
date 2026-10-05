import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import {
  NOTICE_TYPES,
  noticeHref,
  noticeMessage,
  preferenceChanges,
  type NoticeWords,
} from "./notice";

const words: NoticeWords = {
  instrument: (slug) => ({ bass: "Bass", keys: "Keys" })[slug] ?? slug,
  when: (date, time) => (date ? [date, time].filter(Boolean).join(" ") : "no date"),
  day: (date) => `day ${date}`,
  writtenKey: "its written key",
  everyone: "everyone",
  place: (section, bar) => (bar ? `${section}, bar ${bar}` : section),
  reason: (reason) => `because of ${reason}`,
};
const set = { set_id: "s1", set_name: "Sunday 12" };

describe("T-1002 what a notice says", () => {
  it("R-09.1 R-09.3 Luis added as bassist reads the set, its date and time, and his instrument", () => {
    expect(
      noticeMessage(
        {
          type: "lineup_added",
          detail: { ...set, date: "2026-10-12", time: "10:30:00", instrument: "bass" },
        },
        words,
      ),
    ).toEqual({
      key: "lineup_added",
      values: { set: "Sunday 12", when: "2026-10-12 10:30:00", instrument: "Bass" },
    });
  });

  it("R-09.1 a set without a date says so; a temporary MD reads until when", () => {
    expect(
      noticeMessage(
        { type: "lineup_removed", detail: { ...set, date: null, time: null, instrument: "keys" } },
        words,
      )?.values.when,
    ).toBe("no date");
    expect(
      noticeMessage({ type: "temp_md", detail: { ...set, until: "2026-10-12" } }, words),
    ).toEqual({
      key: "temp_md",
      values: { set: "Sunday 12", until: "day 2026-10-12" },
    });
    expect(noticeMessage({ type: "temp_md", detail: { ...set, until: null } }, words)?.key).toBe(
      "temp_md_open",
    );
  });

  it("R-09.2 R-09.3 a key change reads the song, the old key and the new one", () => {
    expect(
      noticeMessage(
        {
          type: "key_changed",
          detail: { ...set, title: "Open Road", old_key: null, new_key: "Bb" },
        },
        words,
      ),
    ).toEqual({
      key: "key_changed",
      values: { title: "Open Road", set: "Sunday 12", from: "its written key", to: "Bb" },
    });
    expect(noticeMessage({ type: "order_changed", detail: set }, words)).toEqual({
      key: "order_changed",
      values: { set: "Sunday 12" },
    });
  });

  it("R-09.2 R-09.3 a note reads the song, where it is, who it is for and its text", () => {
    const note = {
      version_id: "v1",
      title: "Open Road",
      section: "Chorus",
      text: "Walk up to the 4.",
    };
    expect(
      noticeMessage(
        { type: "note_added", detail: { ...note, bar: 2, instruments: ["bass"] } },
        words,
      ),
    ).toEqual({
      key: "note_added",
      values: {
        title: "Open Road",
        place: "Chorus, bar 2",
        text: "Walk up to the 4.",
        for: "Bass",
      },
    });
    expect(
      noticeMessage({ type: "note_added", detail: { ...note, bar: null, instruments: [] } }, words)
        ?.values,
    ).toMatchObject({ place: "Chorus", for: "everyone" });
  });

  it("R-09.4 a new revision reads which one, and which one the set still plays", () => {
    expect(
      noticeMessage(
        {
          type: "new_revision",
          detail: { ...set, version_id: "v1", title: "Open Road", number: 2, pinned_number: 1 },
        },
        words,
      ),
    ).toEqual({
      key: "new_revision",
      values: { title: "Open Road", set: "Sunday 12", number: 2, pinned: 1 },
    });
  });

  it("R-07.2 the owner of a hidden version reads which one and why, and opens it", () => {
    const hidden = {
      type: "version_hidden",
      detail: { version_id: "v1", title: "Open Road", reason: "lyrics" },
    };
    expect(noticeMessage(hidden, words)).toEqual({
      key: "version_hidden",
      values: { title: "Open Road", reason: "because of lyrics" },
    });
    expect(noticeHref(hidden)).toBe("/versions/v1");
  });

  it("R-09.3 a notice opens what it is about; an unknown type is left out", () => {
    expect(noticeHref({ type: "key_changed", detail: set })).toBe("/sets/s1");
    expect(noticeHref({ type: "note_added", detail: { version_id: "v1" } })).toBe("/versions/v1");
    expect(noticeMessage({ type: "something_new", detail: {} }, words)).toBeNull();
  });
});

describe("T-1003 choosing which notices to receive", () => {
  it("R-09.5 turning a kind off saves it off; turning it back on removes the row", () => {
    const all = new Set<string>(NOTICE_TYPES);
    expect(preferenceChanges(all, new Set())).toEqual({ turnOff: [], turnOn: [] });
    const withoutKeys = new Set([...all].filter((type) => type !== "key_changed"));
    expect(preferenceChanges(withoutKeys, new Set())).toEqual({
      turnOff: ["key_changed"],
      turnOn: [],
    });
    expect(preferenceChanges(withoutKeys, new Set(["key_changed"]))).toEqual({
      turnOff: [],
      turnOn: [],
    });
    expect(preferenceChanges(all, new Set(["key_changed", "something_old"]))).toEqual({
      turnOff: [],
      turnOn: ["key_changed"],
    });
  });

  it("R-09.5 every kind of notice can be chosen and read, in both languages", () => {
    for (const messages of [en, es]) {
      for (const type of NOTICE_TYPES) {
        expect(messages.notices.kinds, type).toHaveProperty(type);
        expect(messages.notices.types, type).toHaveProperty(type);
      }
    }
  });
});
