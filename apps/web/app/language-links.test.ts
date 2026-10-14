import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The ChartDown language moved to github.com/ChartDown/spec; the earlier repository is private
// and answers 404 to everyone else (F-007).
function sources(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|json)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("F-007 links to the ChartDown language", () => {
  it("F-007 no page of the app links to the private github.com/ChartDown/Language", () => {
    const root = new URL("..", import.meta.url).pathname;
    const linking = ["app", "lib", "messages"]
      .flatMap((folder) => sources(join(root, folder)))
      .filter((path) => readFileSync(path, "utf8").includes("github.com/ChartDown/Language"))
      .map((path) => path.slice(root.length));
    expect(linking).toEqual([]);
  });
});
