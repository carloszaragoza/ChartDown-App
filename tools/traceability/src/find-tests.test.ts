import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findTestedRequirements, requirementsInTestTitles } from "./find-tests.ts";

describe("requirementsInTestTitles", () => {
  it("reads ids from it, test and describe titles in any quote style", () => {
    const source = `
      describe("R-06.4 privacy of the layer", () => {
        it('R-06.2 a musician sees general notes', () => {});
        test(\`R-06.1 uses the lineup instrument\`, () => {});
      });`;
    expect(requirementsInTestTitles(source)).toEqual(["R-06.4", "R-06.2", "R-06.1"]);
  });

  it("counts .only, .concurrent and .each tests", () => {
    const source = `
      it.only("R-01.1 signs in", () => {});
      test.concurrent("R-01.2 saves the profile", async () => {});
      it.each([[1], [2]])("R-01.5 language %i", () => {});`;
    expect(requirementsInTestTitles(source)).toEqual(["R-01.1", "R-01.2", "R-01.5"]);
  });

  it("ignores skipped and todo tests, comments and other strings", () => {
    const source = `
      // R-02.1 is covered elsewhere
      const label = "R-02.2";
      it.skip("R-02.3 skipped", () => {});
      it.todo("R-02.4 later");
      it("has no id", () => {});`;
    expect(requirementsInTestTitles(source)).toEqual([]);
  });
});

describe("findTestedRequirements", () => {
  it("scans test files only and skips excluded and build folders", () => {
    const root = mkdtempSync(join(tmpdir(), "traceability-"));
    for (const dir of ["packages/core/src", "node_modules/x", "tools/traceability/src"]) {
      mkdirSync(join(root, dir), { recursive: true });
    }
    writeFileSync(
      join(root, "packages/core/src/parser.test.ts"),
      `it("R-00.3 returns JSON", () => {});`,
    );
    writeFileSync(
      join(root, "packages/core/src/parser.ts"),
      `it("R-00.4 not a test file", () => {});`,
    );
    writeFileSync(join(root, "node_modules/x/a.test.ts"), `it("R-00.1 dependency", () => {});`);
    writeFileSync(
      join(root, "tools/traceability/src/b.test.ts"),
      `it("R-00.2 fixture", () => {});`,
    );

    const tested = findTestedRequirements(root, ["tools/traceability"]);
    expect(Object.fromEntries(tested)).toEqual({ "R-00.3": ["packages/core/src/parser.test.ts"] });
  });
});
