import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";

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
  "13",
  "14",
  "15",
];
// Spec sections without parser rules, listed so nothing is skipped silently.
const NOT_PARSER_RULES: Record<string, string> = {
  "1": "goals",
  "4.2": "views: the per-instrument view (T-203, T-802)",
  "12": "numbers and letters (T-103 adds its cases here)",
  "16": "roadmap",
  "17": "changelog",
};

interface Case {
  file: string;
  section: string;
  title: string;
  source: string;
  expected: string;
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
      const item: Case = { file, section, title: words.join(" "), source, expected };
      if (todo !== undefined) item.todo = todo;
      cases.push(item);
    }
  }
  return cases;
}

const cases = readCases();
const passing = cases.filter((c) => c.todo === undefined);

describe("R-00.3 conformance with ChartDown 0.4", () => {
  it.each(passing)("R-00.3 spec $section $title", ({ source, expected }) => {
    expect(parse(source)).toMatchObject(JSON.parse(expected));
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
