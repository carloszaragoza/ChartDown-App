import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTaskRequirements } from "./parse-tasks.ts";

const taskList = `
| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-001 | Monorepo with \`packages/core\` | Technical Plan 9 | – | S | Builds |
| T-401 | Sign-in methods | R-01.1, Technical Plan 12.1 | T-301 | M | One account |
| T-501 | Create a song | R-02.1 to R-02.3 | T-304 | M | Clear error |
`;

describe("parseTaskRequirements", () => {
  it("maps each task to the requirement ids in its Requirements column", () => {
    const tasks = parseTaskRequirements(taskList);
    expect(tasks.get("T-001")).toEqual([]);
    expect(tasks.get("T-401")).toEqual(["R-01.1"]);
    expect(tasks.get("T-501")).toEqual(["R-02.1", "R-02.2", "R-02.3"]);
  });

  it("reads every task in the real task list", () => {
    const real = readFileSync(new URL("../../../specs/lista-tareas.md", import.meta.url), "utf8");
    const tasks = parseTaskRequirements(real);
    expect(tasks.get("T-801")).toEqual(["R-06.1", "R-06.2", "R-06.4"]);
    expect(tasks.get("T-1001")).toEqual(["R-09.1", "R-09.2", "R-09.3", "R-09.4"]);
    expect(tasks.get("T-002")).toEqual([]);
  });
});
