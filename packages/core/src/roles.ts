import type { Role } from "./types.js";
import type { Warn } from "./warnings.js";

export const EVERYONE = "everyone";

/** The standard roles of ChartDown 0.4 (spec 4.1). */
export const STANDARD_ROLES = [
  "drums",
  "bass",
  "keys",
  "guitar",
  "vocals",
  "saxophone",
  "trumpet",
  "trombone",
  "violin",
] as const;

const ALIASES = new Map<string, Role>([
  ["all", EVERYONE],
  ["band", EVERYONE],
  ["everyone", EVERYONE],
  ["drums", "drums"],
  ["drum", "drums"],
  ["perc", "drums"],
  ["bass", "bass"],
  ["keys", "keys"],
  ["piano", "keys"],
  ["pad", "keys"],
  ["synth", "keys"],
  ["gtr", "guitar"],
  ["guitar", "guitar"],
  ["eg", "guitar"],
  ["ag", "guitar"],
  ["vox", "vocals"],
  ["vocals", "vocals"],
  ["lead", "vocals"],
  ["bgv", "vocals"],
  ["bgvs", "vocals"],
  ["sax", "saxophone"],
  ["saxophone", "saxophone"],
  ["tpt", "trumpet"],
  ["trumpet", "trumpet"],
  ["tbn", "trombone"],
  ["trombone", "trombone"],
  ["vln", "violin"],
  ["violin", "violin"],
]);

/** Resolves a list of instrument names to roles, or undefined if any name is unknown. */
export type RoleResolver = (names: string) => Role[] | undefined;

export function createRoleResolver(customInstruments: readonly string[]): RoleResolver {
  const custom = new Set(customInstruments);
  return (names) => {
    const parts = names
      .split(/[,/&\s]+/)
      .filter(Boolean)
      .map((name) => name.toLowerCase());
    if (parts.length === 0) return undefined;
    const roles: Role[] = [];
    for (const part of parts) {
      const role = ALIASES.get(part) ?? (custom.has(part) ? part : undefined);
      if (role === undefined) return undefined;
      if (!roles.includes(role)) roles.push(role);
    }
    return roles;
  };
}

/** Custom instrument ids from the `instruments` header (spec 4.1). */
export function parseInstrumentsHeader(value: string, line: number, warn: Warn): string[] {
  const ids: string[] = [];
  for (const id of value.split(",").map((part) => part.trim().toLowerCase())) {
    if (!id) continue;
    if (/^[a-z0-9-]+$/.test(id)) {
      if (!ids.includes(id)) ids.push(id);
    } else warn(line, "instrument-id", { id });
  }
  return ids;
}
