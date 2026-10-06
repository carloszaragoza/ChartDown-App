import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  name: string;
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
    expect(manifest.repository.url).toContain("github.com/ChartDown/Language");
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
