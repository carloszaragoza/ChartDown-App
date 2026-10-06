import { sectionLength, type Chart, type SectionLength } from "chartdown";

export type FormState = "played" | "current" | "upcoming";

export interface FormStripItem {
  name: string;
  abbreviation: string;
  length: SectionLength;
  state: FormState;
  hasNotes: boolean;
  href: string;
}

export interface FormStripLabels {
  /** Accessible name of the strip, for example "Song form". */
  nav: string;
  /** The full description of a chip, read by screen readers and shown as its tooltip. */
  describe: (item: FormStripItem) => string;
}

// Design Handoff 3: Intro I · Verse V1, V2 · Pre-chorus PC · Chorus C, C2 · Bridge B ·
// Instrumental Inst · Tag T · Last Chorus LC · Outro O. Custom names: their initials.
const KNOWN: Record<string, string> = {
  intro: "I",
  verse: "V",
  "pre-chorus": "PC",
  prechorus: "PC",
  "pre chorus": "PC",
  chorus: "C",
  bridge: "B",
  instrumental: "Inst",
  tag: "T",
  "last chorus": "LC",
  outro: "O",
};

/** A section's chart abbreviation: "Verse 1" → V1, "Last Chorus" → LC, "Big Ending" → BE. */
export function abbreviate(name: string): string {
  const match = /^(.*?)\s*(\d+)?$/.exec(name.trim());
  const base = (match?.[1] ?? "").toLowerCase().replace(/\s+/g, " ");
  const number = match?.[2] ?? "";
  const known = KNOWN[base];
  const initials = base
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return (known ?? initials) + number || name.trim().charAt(0).toUpperCase();
}

/**
 * The song map's items from a chart: sections before `current` are played. A name used
 * again without its own number gets one ("Chorus", "Chorus" → C, C2).
 */
export function formStripItems(
  chart: Chart,
  current: number,
  hasNotes: (index: number) => boolean,
): FormStripItem[] {
  const seen = new Map<string, number>();
  return chart.sections.map((section, index) => {
    const abbreviation = abbreviate(section.name);
    const count = (seen.get(abbreviation) ?? 0) + 1;
    seen.set(abbreviation, count);
    return {
      name: section.name,
      abbreviation:
        count > 1 && !/\d$/.test(abbreviation) ? `${abbreviation}${count}` : abbreviation,
      length: sectionLength(section),
      state: index < current ? "played" : index === current ? "current" : "upcoming",
      hasNotes: hasNotes(index),
      href: `#section-${index + 1}`,
    };
  });
}

export interface FormStripProps {
  items: readonly FormStripItem[];
  labels: FormStripLabels;
}

/**
 * The song map (Design Handoff 3): every section as a chip with its abbreviation and length,
 * played, now (inverted) or coming, and a red dot where notes are waiting, always also said in words.
 */
export function FormStrip({ items, labels }: FormStripProps) {
  return (
    <nav className="cd-form" aria-label={labels.nav}>
      <ol className="cd-form__list">
        {items.map((item, index) => {
          const description = labels.describe(item);
          return (
            <li key={index}>
              <a
                className={`cd-form__chip cd-form__chip--${item.state}`}
                href={item.href}
                title={description}
                aria-current={item.state === "current" ? "true" : undefined}
              >
                {item.hasNotes && <span className="cd-form__dot" aria-hidden="true" />}
                <span className="cd-form__abbreviation" aria-hidden="true">
                  {item.abbreviation}
                </span>
                <span className="cd-form__length" aria-hidden="true">
                  {item.length.times > 1
                    ? `${item.length.perPass}×${item.length.times}`
                    : item.length.perPass}
                </span>
                <span className="cd-visually-hidden">{description}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
