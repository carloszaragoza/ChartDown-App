/** Interface languages (R-01.5): English by default, Spanish as an option. */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the language in use: a visitor's choice, or the profile's once signed in (R-01.5). */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The language a first-time visitor sees (R-01.5): the supported language their browser ranks
 * highest in `Accept-Language`, and English when it lists none of ours.
 */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part, order) => {
      const [range = "", ...params] = part.trim().split(";");
      const q = params.map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1]).find(Boolean);
      return { tag: range.trim().toLowerCase().split("-")[0] ?? "", q: q ? Number(q) : 1, order };
    })
    .filter((item) => item.tag && item.q > 0)
    .sort((a, b) => b.q - a.q || a.order - b.order);
  return ranked.map((item) => item.tag).find(isLocale) ?? DEFAULT_LOCALE;
}
