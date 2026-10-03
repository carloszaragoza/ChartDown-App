import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chordFormatter, keyName, parseKeyName } from "./display.js";
import { parse } from "./parse.js";
import type { Chart } from "./types.js";

// Spec sections with parser rules: each needs at least one passing case.
const REQUIRED = [
  "2",
  "3",
  "4",
  "4.1",
  "5",
  "5.1",
  "5.2",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
];
// Spec sections without parser rules, listed so nothing is skipped silently.
const NOT_PARSER_RULES: Record<string, string> = {
  "1": "goals",
  "4.2": "views: the per-instrument view (T-203, T-802)",
  "16": "roadmap",
  "17": "changelog",
};

interface Case {
  file: string;
  section: string;
  title: string;
  source: string;
  expected: string;
  /** Display options: the case then checks the chords as shown, not the parsed tree. */
  display?: string;
  todo?: string;
}

const DIR = new URL("../conformance/", import.meta.url);

function readCases(): Case[] {
  const cases: Case[] = [];
  for (const file of readdirSync(DIR)
    .filter((name) => /^\d{2}(\.\d+)?-.+\.md$/.test(name))
    .sort()) {
    const chunks = readFileSync(new URL(file, DIR), "utf8").split(/^### /m).slice(1);
    for (const chunk of chunks) {
      const heading = chunk.slice(0, chunk.indexOf("\n")).trim();
      const [section = "", ...words] = heading.split(" ");
      const source = /```chartdown\n([\s\S]*?)```/.exec(chunk)?.[1];
      const expected = /```json\n([\s\S]*?)```/.exec(chunk)?.[1];
      if (source === undefined || expected === undefined) {
        throw new Error(`${file}: "${heading}" needs a chartdown block and a json block`);
      }
      const todo = /^todo:\s*(.+)$/m.exec(chunk)?.[1];
      const display = /```display\n([\s\S]*?)```/.exec(chunk)?.[1];
      const item: Case = { file, section, title: words.join(" "), source, expected };
      if (todo !== undefined) item.todo = todo;
      if (display !== undefined) item.display = display;
      cases.push(item);
    }
  }
  return cases;
}

/** A chart as shown: its home key, each row's key, and each row as "chord chord | chord". */
function shown(chart: Chart, display: string) {
  const options = JSON.parse(display) as { style: "numbers" | "letters"; key?: string };
  const key = options.key === undefined ? undefined : parseKeyName(options.key);
  const fmt = chordFormatter(
    chart,
    key === undefined ? { style: options.style } : { style: options.style, key },
  );
  const rows = chart.sections.flatMap((section) => section.rows);
  const special = { "no-chord": "x", "repeat-bar": "%", tie: "=" } as const;
  return {
    homeKey: keyName(fmt.homeKey),
    keys: rows.map((row) => keyName(fmt.rowKey(row))),
    rows: rows.map((row) =>
      row.bars
        .map((bar) =>
          bar.items
            .map((item) => (item.type === "chord" ? fmt.chord(item, row).text : special[item.type]))
            .join(" "),
        )
        .join(" | "),
    ),
  };
}

const cases = readCases();
const passing = cases.filter((c) => c.todo === undefined);

describe("R-00.3 conformance with ChartDown 0.4", () => {
  it.each(passing)("R-00.3 spec $section $title", ({ source, expected, display }) => {
    const chart = parse(source);
    expect(display === undefined ? chart : shown(chart, display)).toMatchObject(
      JSON.parse(expected),
    );
  });

  for (const c of cases.filter((c) => c.todo !== undefined)) {
    it.todo(`spec ${c.section} ${c.title} (${c.todo})`);
  }

  it("R-00.3 every spec section with parser rules has passing cases", () => {
    const covered = new Set(passing.map((c) => c.section));
    expect(REQUIRED.filter((section) => !covered.has(section))).toEqual([]);
  });

  it("R-00.3 cases only name spec sections with parser rules", () => {
    const misplaced = cases.filter((c) => !REQUIRED.includes(c.section));
    expect(
      misplaced.map(
        (c) => `${c.file}: ${c.section} (${NOT_PARSER_RULES[c.section] ?? "unknown section"})`,
      ),
    ).toEqual([]);
  });
});
