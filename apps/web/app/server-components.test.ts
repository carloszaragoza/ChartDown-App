import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Astryx components are client components. A server component may pass them elements and
// plain values, never a function: Next refuses it at runtime ("Functions cannot be passed
// directly to Client Components"), which only shows up when the page renders (T-1301).
const FORBIDDEN = [
  { pattern: /\bas=\{Link\}/, why: "a link component (as={Link})" },
  { pattern: /<Icon icon=\{/, why: "an icon component (<Icon icon={…} />)" },
  // An arrow function as a prop, like notes={(index) => …} (T-1304).
  { pattern: /\s[a-zA-Z]+=\{\s*\([^()]*\)\s*=>/, why: "a function as a prop" },
];

function files(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe("T-1301 server components and Astryx", () => {
  it("T-1301 no server component passes a function to an Astryx client component", () => {
    const root = new URL(".", import.meta.url).pathname;
    const problems = files(root).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      if (/^["']use client["'];/m.test(source)) return [];
      return FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map(
        ({ why }) => `${path.slice(root.length)} passes ${why}`,
      );
    });
    expect(problems).toEqual([]);
  });

  it("T-1304 a client file exports no plain values, which a server component can't read", () => {
    // A server component that imports a list or a constant from a "use client" file gets a
    // reference to it, not the value (SET_TYPES.map is not a function).
    const root = new URL(".", import.meta.url).pathname;
    const problems = files(root).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      if (!/^["']use client["'];/m.test(source)) return [];
      return [...source.matchAll(/^export const (\w+) = (?!\(|async\b|function\b)/gm)].map(
        (match) => `${path.slice(root.length)} exports ${match[1]}`,
      );
    });
    expect(problems).toEqual([]);
  });
});
