import { readFileSync } from "node:fs";

export const EXAMPLES = ["lantern-bay", "open-road", "syntax-tour"] as const;

export function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}.chartdown`, import.meta.url), "utf8");
}
