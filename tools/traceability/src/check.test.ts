import { describe, expect, it } from "vitest";
import { checkTraceability, type CheckInput } from "./check.ts";

function input(overrides: Partial<CheckInput>): CheckInput {
  return {
    prTitle: undefined,
    taskRequirements: new Map([
      ["T-001", []],
      ["T-501", ["R-02.1", "R-02.2", "R-02.3"]],
    ]),
    definedRequirements: new Set(["R-02.1", "R-02.2", "R-02.3"]),
    testedRequirements: new Map(),
    ...overrides,
  };
}

const allTested = new Map([
  ["R-02.1", ["a.test.ts"]],
  ["R-02.2", ["a.test.ts"]],
  ["R-02.3", ["b.test.ts"]],
]);

describe("checkTraceability", () => {
  it("passes a task pull request whose requirements all have tests", () => {
    const result = checkTraceability(
      input({ prTitle: "T-501: create a song", testedRequirements: allTested }),
    );
    expect(result.errors).toEqual([]);
  });

  it("fails a task pull request without a test for one of its requirements", () => {
    const tested = new Map(allTested);
    tested.delete("R-02.2");
    const result = checkTraceability(
      input({ prTitle: "T-501: create a song", testedRequirements: tested }),
    );
    expect(result.errors).toEqual(["T-501 requires R-02.2, but no test title names it"]);
  });

  it("passes a task that lists no requirement ids", () => {
    expect(checkTraceability(input({ prTitle: "T-001: monorepo" })).errors).toEqual([]);
  });

  it("fails a task id that is not in the task list", () => {
    expect(checkTraceability(input({ prTitle: "T-999: unknown" })).errors).toEqual([
      "T-999 is not in specs/lista-tareas.md",
    ]);
  });

  it("accepts chore pull requests without a task", () => {
    expect(checkTraceability(input({ prTitle: "chore(deps): bump turbo" })).errors).toEqual([]);
  });

  it("fails a pull request title without a task id or chore prefix", () => {
    expect(checkTraceability(input({ prTitle: "Add a parser" })).errors).toHaveLength(1);
  });

  it("fails a test named with a requirement id the specs don't define, even on main", () => {
    const tested = new Map([["R-02.9", ["typo.test.ts"]]]);
    expect(checkTraceability(input({ testedRequirements: tested })).errors).toEqual([
      "R-02.9 is named in a test but is not defined in specs/plan-sdd.md (typo.test.ts)",
    ]);
  });
});
