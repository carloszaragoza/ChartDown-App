import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { display, toJSON } from "./conformance.js";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("R-00.12 chartdown passes the official ChartDown conformance suite", () => {
  it("R-00.12 the suite is a copy pinned to a commit of github.com/ChartDown/spec", () => {
    const pinned = readFileSync(new URL("../conformance/PINNED.md", import.meta.url), "utf8");
    expect(pinned).toMatch(/github\.com\/ChartDown\/spec/);
    expect(pinned).toMatch(/`[0-9a-f]{40}`/);
  });

  it(
    "R-00.12 every case passes through the suite's own runner, sections without a case included",
    { timeout: 120_000 },
    () => {
      // The runner imports the adapter as JavaScript: the package is built first.
      const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
      execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root });
      let out: string;
      try {
        out = execFileSync(process.execPath, ["conformance/run.mjs", "dist/conformance.js"], {
          cwd: root,
          encoding: "utf8",
        });
      } catch (error) {
        // The runner exits with 1 and lists what failed.
        throw new Error((error as { stdout?: string }).stdout ?? String(error));
      }
      expect(out).toMatch(/^\d+ passed, 0 failed$/m);
      expect(out).not.toMatch(/skipped|Spec sections with no case/);
    },
  );

  it("R-00.12 the adapter gives the JSON form and the chords as shown", () => {
    expect(toJSON("## Verse\n1 | 4\n").sections[0]?.name).toBe("Verse");
    expect(
      display("---\nkey: G\n---\n## A\n1 | 4 | 5 | 6m\n", { style: "letters", key: "A" }),
    ).toEqual({
      homeKey: "A",
      keys: ["A"],
      rows: ["A | D | E | F#m"],
    });
  });
});
