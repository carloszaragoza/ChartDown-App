import { readFileSync } from "node:fs";

export const EXAMPLES = ["lantern-bay", "open-road", "syntax-tour"] as const;

/** The ChartDown 0.6 examples of the Language repository, in `fixtures/0.6`. */
export const EXAMPLES_06 = ["lantern-bay", "northbound", "open-road", "syntax-tour"] as const;

/** The ChartDown 0.7 examples of github.com/ChartDown/spec at 1e103c9, in `fixtures/0.7`. */
export const EXAMPLES_07 = ["lantern-bay", "northbound", "open-road", "syntax-tour"] as const;

export function fixture07(name: string): string {
  return readFileSync(new URL(`../fixtures/0.7/${name}.chartdown`, import.meta.url), "utf8");
}

export function fixture06(name: string): string {
  return readFileSync(new URL(`../fixtures/0.6/${name}.chartdown`, import.meta.url), "utf8");
}

export function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}.chartdown`, import.meta.url), "utf8");
}
