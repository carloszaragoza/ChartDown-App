import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findTestedRequirements } from "./find-tests.ts";
import { parseTaskRequirements } from "./parse-tasks.ts";
import { parseDefinedRequirements } from "./requirements.ts";

export interface CheckInput {
  /** The pull request title, or undefined on a push to main. */
  prTitle: string | undefined;
  taskRequirements: Map<string, string[]>;
  definedRequirements: Set<string>;
  testedRequirements: Map<string, string[]>;
}

export interface CheckResult {
  errors: string[];
  notes: string[];
}

export function checkTraceability(input: CheckInput): CheckResult {
  const errors: string[] = [];
  const notes: string[] = [];

  for (const [id, files] of input.testedRequirements) {
    if (!input.definedRequirements.has(id)) {
      errors.push(
        `${id} is named in a test but is not defined in specs/plan-sdd.md (${files.join(", ")})`,
      );
    }
  }

  const title = input.prTitle?.trim();
  if (title === undefined || title === "") return { errors, notes };

  const task = /^(T-\d+)\b/.exec(title)?.[1];
  if (task === undefined) {
    if (/^chore(\([^)]*\))?:/i.test(title)) {
      notes.push("Chore pull request: no task requirements to check.");
    } else {
      errors.push(
        `The pull request title must start with a task id ("T-101: …") or "chore:". Got: "${title}"`,
      );
    }
    return { errors, notes };
  }

  const requirements = input.taskRequirements.get(task);
  if (requirements === undefined) {
    errors.push(`${task} is not in specs/lista-tareas.md`);
  } else if (requirements.length === 0) {
    notes.push(`${task} lists no R-xx requirements: nothing to check.`);
  } else {
    for (const id of requirements) {
      const files = input.testedRequirements.get(id);
      if (files === undefined) errors.push(`${task} requires ${id}, but no test title names it`);
      else notes.push(`${id}: ${files.join(", ")}`);
    }
  }
  return { errors, notes };
}

function main(): void {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const read = (path: string) => readFileSync(join(root, path), "utf8");

  const { errors, notes } = checkTraceability({
    prTitle: process.env.PR_TITLE,
    taskRequirements: parseTaskRequirements(read("specs/lista-tareas.md")),
    definedRequirements: parseDefinedRequirements(read("specs/plan-sdd.md")),
    // This tool's own tests use requirement ids as fixtures, not as coverage.
    testedRequirements: findTestedRequirements(root, ["tools/traceability"]),
  });

  for (const note of notes) console.log(`  ${note}`);
  for (const error of errors) console.error(`✗ ${error}`);
  if (errors.length > 0) process.exit(1);
  console.log("✓ Traceability check passed");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
