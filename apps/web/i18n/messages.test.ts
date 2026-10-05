import { WARNING_CODES } from "@chartdown/core";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import es from "../messages/es.json";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "./locales";

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

const english = flatten(en);
const spanish = flatten(es);
const placeholders = (text: string) =>
  Array.from(text.matchAll(/\{(\w+)\}/g), ([, name]) => name).sort();
const codeFragments = (text: string) =>
  Array.from(text.matchAll(/<code>(.*?)<\/code>/g), ([, code]) => code);

// Messages that are the same in both languages on purpose: the product name and the
// language names, which are always written in their own language, an instrument name
// spelled the same in both, and "Sets", which Spanish-speaking musicians say too.
const SAME_IN_BOTH = new Set([
  "home.title",
  "language.en",
  "language.es",
  "design.newInstrument",
  "chart.tempo",
  "bands.sets",
  "landing.footer.copyright",
]);

describe("R-01.5 interface in English by default, with Spanish as an option", () => {
  it("R-01.5 English is the default and Spanish is the only other language", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["en", "es"]);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("R-01.5 switching to Spanish translates the whole UI: every message exists in both languages", () => {
    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
    for (const [key, text] of Object.entries(spanish)) {
      expect(text.trim(), key).not.toBe("");
      if (!SAME_IN_BOTH.has(key)) expect(text, `${key} looks untranslated`).not.toBe(english[key]);
    }
  });

  it("R-01.5 Spanish messages use the same placeholders as English", () => {
    for (const [key, text] of Object.entries(english))
      expect(placeholders(spanish[key] ?? ""), key).toEqual(placeholders(text));
  });

  it("R-01.5 switching to Spanish never translates the syntax", () => {
    for (const [key, text] of Object.entries(english)) {
      expect(codeFragments(spanish[key] ?? ""), key).toEqual(codeFragments(text));
    }
    // ChartDown syntax that a message shows must be marked as code, so the check above covers it.
    for (const [key, text] of Object.entries({ ...english, ...spanish })) {
      const outsideCode = text.replace(/<code>.*?<\/code>/g, "");
      expect(outsideCode, key).not.toMatch(/##|@use|@key|---|\bMD\b/);
    }
  });

  it("R-01.5 every parser warning has an English and a Spanish message with its values", () => {
    for (const code of WARNING_CODES) {
      expect(english[`warnings.${code}`], `en ${code}`).toBeDefined();
      expect(spanish[`warnings.${code}`], `es ${code}`).toBeDefined();
    }
    expect(Object.keys(en.warnings).sort()).toEqual([...WARNING_CODES].sort());
    expect(placeholders(es.warnings["landmark-too-long"])).toEqual(["max", "words"]);
  });
});
