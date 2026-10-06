// The instrument catalog form (R-07.3): names and the other names a chart may use.

export interface InstrumentFields {
  name_en: string;
  name_es: string;
  aliases: string[];
}
export type InstrumentProblem = "slug" | "name" | "alias";

const SLUG = /^[a-z0-9-]+$/;
const ALIAS = /^[a-z0-9-]+$/;

/** A new instrument's slug: lowercase letters, digits and dashes, as charts write it. */
export function readSlug(value: unknown): string | null {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();
  return slug.length >= 1 && slug.length <= 30 && SLUG.test(slug) ? slug : null;
}

/** The names and aliases from the form, or what is wrong with them. */
export function readInstrument(form: {
  name_en: unknown;
  name_es: unknown;
  aliases: unknown;
}): { fields: InstrumentFields } | { problem: InstrumentProblem } {
  const name_en = String(form.name_en ?? "").trim();
  const name_es = String(form.name_es ?? "").trim();
  if (name_en.length < 1 || name_en.length > 40 || name_es.length < 1 || name_es.length > 40)
    return { problem: "name" };
  const aliases = [
    ...new Set(
      String(form.aliases ?? "")
        .split(",")
        .map((alias) => alias.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (aliases.some((alias) => !ALIAS.test(alias) || alias.length > 30)) return { problem: "alias" };
  return { fields: { name_en, name_es, aliases } };
}
