import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  name: string;
  version: string;
  description: string;
  license: string;
  files: string[];
  exports: Record<string, { import: string; types: string }>;
  dependencies?: Record<string, string>;
  repository: { url: string };
};

describe("T-107 the chartdown package on npm", () => {
  it("T-107 is published as chartdown under MIT, pointing to the public language repository", () => {
    expect(manifest.name).toBe("chartdown");
    expect(manifest.license).toBe("MIT");
    // The language moved to github.com/ChartDown/spec; ChartDown/Language is private (F-007).
    expect(manifest.repository.url).toContain("github.com/ChartDown/spec");
    expect((manifest as { homepage?: string }).homepage).toBe("https://github.com/ChartDown/spec");
  });

  it("T-107 ships its build and sources, never its tests, and depends on nothing", () => {
    expect(manifest.files).toEqual(expect.arrayContaining(["dist", "README.md", "LICENSE"]));
    expect(manifest.files).toContain("!src/**/*.test.ts");
    expect(manifest.exports["."]?.import).toBe("./dist/index.js");
    expect(manifest.exports["."]?.types).toBe("./dist/index.d.ts");
    // A workspace dependency would not install in a new project.
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([]);
  });
});

describe("T-1708 the chartdown package on npm, version 0.2.0 for ChartDown 0.6", () => {
  it("T-1708 is version 0.2.0 of the parser for spec 0.6, with its changelog in the package", () => {
    expect(manifest.version).toBe("0.2.0");
    expect(manifest.description).toContain("spec 0.6");
    expect(manifest.files).toContain("CHANGELOG.md");
    const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    // An unreleased section may come first, above the latest release.
    expect(changelog).toMatch(/^# Changelog\n\n(## Unreleased[^\n]*\n[\s\S]*?\n)?## 0\.2\.0\n/);
    expect(changelog).toContain("## 0.1.0");
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toContain("spec 0.6");
    expect(readme).toContain("toJSON");
  });

  it(
    "T-1708 a packed copy installs in a new project and parses Northbound",
    { timeout: 180_000 },
    () => {
      const root = fileURLToPath(new URL("..", import.meta.url));
      const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
      execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root });

      const work = mkdtempSync(join(tmpdir(), "chartdown-pack-"));
      execFileSync("npm", ["pack", "--pack-destination", work, "--silent"], { cwd: root });
      const tarball = readdirSync(work).find((name) => name.endsWith(".tgz")) as string;
      expect(tarball).toBe("chartdown-0.2.0.tgz");

      const project = join(work, "project");
      execFileSync("mkdir", [project]);
      writeFileSync(
        join(project, "package.json"),
        JSON.stringify({ name: "new-project", type: "module" }),
      );
      execFileSync(
        "npm",
        [
          "install",
          join(work, tarball),
          "--no-audit",
          "--no-fund",
          "--ignore-scripts",
          "--offline",
        ],
        { cwd: project },
      );
      const northbound = join(root, "fixtures", "0.6", "northbound.chartdown");
      writeFileSync(
        join(project, "check.mjs"),
        `import { readFileSync } from "node:fs";
import { parse, playOrder, SUPPORTED_VERSION, toJSON } from "chartdown";
const chart = parse(readFileSync(${JSON.stringify(northbound)}, "utf8"));
console.log(JSON.stringify({ version: SUPPORTED_VERSION, sections: chart.sections.length, warnings: chart.warnings.length, steps: playOrder(chart).length, json: toJSON(chart).chartdown }));`,
      );
      const out = execFileSync(process.execPath, ["check.mjs"], { cwd: project }).toString();
      expect(JSON.parse(out)).toEqual({
        // The parser reads ChartDown 0.7 since E20; Northbound still declares 0.6.
        version: "0.7",
        sections: 5,
        warnings: 0,
        steps: 57,
        json: "0.6",
      });
    },
  );
});

describe("R-00.12 the package ships the adapter for the official conformance suite", () => {
  it("R-00.12 exports chartdown/conformance with its types", () => {
    expect(manifest.exports["./conformance"]).toEqual({
      types: "./dist/conformance.d.ts",
      import: "./dist/conformance.js",
    });
  });

  it(
    "R-00.12 a packed copy installs in a new project and passes the suite through its own adapter",
    { timeout: 180_000 },
    () => {
      const root = fileURLToPath(new URL("..", import.meta.url));
      const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
      execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root });

      const work = mkdtempSync(join(tmpdir(), "chartdown-suite-"));
      execFileSync("npm", ["pack", "--pack-destination", work, "--silent"], { cwd: root });
      const tarball = readdirSync(work).find((name) => name.endsWith(".tgz")) as string;
      const project = join(work, "project");
      execFileSync("mkdir", [project]);
      writeFileSync(
        join(project, "package.json"),
        JSON.stringify({ name: "new-project", type: "module" }),
      );
      execFileSync(
        "npm",
        [
          "install",
          join(work, tarball),
          "--no-audit",
          "--no-fund",
          "--ignore-scripts",
          "--offline",
        ],
        { cwd: project },
      );
      // The one line the package's README gives.
      writeFileSync(join(project, "adapter.mjs"), 'export * from "chartdown/conformance";\n');
      const out = execFileSync(
        process.execPath,
        [join(root, "conformance", "run.mjs"), join(project, "adapter.mjs")],
        { encoding: "utf8" },
      );
      expect(out).toMatch(/^\d+ passed, 0 failed$/m);
    },
  );
});
