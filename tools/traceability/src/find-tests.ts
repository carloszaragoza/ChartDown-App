import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { extractRequirementIds } from "./requirements.ts";

const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/;
const SKIPPED_DIRS = new Set(["node_modules", "dist", ".next", ".turbo", ".git", "coverage"]);

// it("…"), test("…"), describe("…"), including .only, .concurrent and .each(…).
// .skip and .todo don't count: a skipped test proves nothing.
const TEST_TITLE =
  /\b(?:it|test|describe)(?:\.(?:only|concurrent|each\((?:[^()]|\([^()]*\))*\)))*\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

/** Requirement ids named in the test titles of one file's source. */
export function requirementsInTestTitles(source: string): string[] {
  const ids = Array.from(source.matchAll(TEST_TITLE), ([, , title]) =>
    extractRequirementIds(title ?? ""),
  );
  return [...new Set(ids.flat())];
}

function* testFiles(dir: string, excluded: string[]): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (excluded.includes(path)) continue;
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) yield* testFiles(path, excluded);
    } else if (TEST_FILE.test(entry.name)) {
      yield path;
    }
  }
}

/** Maps each requirement id found in a test title to the files (relative to root) that name it. */
export function findTestedRequirements(
  root: string,
  excluded: string[] = [],
): Map<string, string[]> {
  const tested = new Map<string, string[]>();
  for (const file of testFiles(
    root,
    excluded.map((dir) => join(root, dir)),
  )) {
    for (const id of requirementsInTestTitles(readFileSync(file, "utf8"))) {
      tested.set(id, [...(tested.get(id) ?? []), relative(root, file)]);
    }
  }
  return tested;
}
