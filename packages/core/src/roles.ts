import type { Instrument, Role } from "./types.js";
import type { Warn } from "./warnings.js";

export const EVERYONE = "everyone";

/** Names that mean the whole band. They are part of the language, not instruments. */
const EVERYONE_NAMES = ["all", "band", "everyone"];

/**
 * The standard roles of ChartDown 0.4 and their accepted names (spec 4.1). The parser
 * uses them when the app does not pass the Admin's catalog.
 */
export const STANDARD_INSTRUMENTS: readonly Instrument[] = [
  { id: "drums", names: ["drums", "drum", "perc"] },
  { id: "bass", names: ["bass"] },
  { id: "keys", names: ["keys", "piano", "pad", "synth"] },
  { id: "guitar", names: ["gtr", "guitar", "eg", "ag"] },
  { id: "vocals", names: ["vox", "vocals", "lead", "bgv", "bgvs"] },
  { id: "saxophone", names: ["sax", "saxophone"] },
  { id: "trumpet", names: ["tpt", "trumpet"] },
  { id: "trombone", names: ["tbn", "trombone"] },
  { id: "violin", names: ["vln", "violin"] },
];

/** Resolves a list of instrument names to roles, or undefined if any name is unknown. */
export type RoleResolver = (names: string) => Role[] | undefined;

/**
 * Builds the instrument names a chart understands (R-00.1): "everyone", the catalog's
 * instruments, then the custom ids the chart declares. The first meaning of a name wins.
 */
export function createRoleResolver(
  catalog: readonly Instrument[],
  customInstruments: readonly string[],
): RoleResolver {
  const known = new Map<string, Role>(EVERYONE_NAMES.map((name) => [name, EVERYONE]));
  const add = (name: string, role: Role) => {
    const key = name.toLowerCase();
    if (!known.has(key)) known.set(key, role);
  };
  for (const instrument of catalog) {
    add(instrument.id, instrument.id);
    for (const name of instrument.names) add(name, instrument.id);
  }
  for (const id of customInstruments) add(id, id);

  return (names) => {
    const parts = names
      .split(/[,/&\s]+/)
      .filter(Boolean)
      .map((name) => name.toLowerCase());
    if (parts.length === 0) return undefined;
    const roles: Role[] = [];
    for (const part of parts) {
      const role = known.get(part);
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
