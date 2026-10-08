import {
  createRoleResolver,
  EVERYONE,
  parseInstrumentsHeader,
  STANDARD_INSTRUMENTS,
  type RoleResolver,
} from "./roles.js";
import type { Note, ParseOptions } from "./types.js";
import type { Warn } from "./warnings.js";

export interface Header {
  /** Every header field, names lowercased. */
  fields: Record<string, string>;
  /** The declared `chartdown` version, if any. */
  version?: string;
  /** Custom instrument ids declared in the `instruments` field. */
  instruments: string[];
  roles: RoleResolver;
  /** Index of the first line after the header. */
  bodyStart: number;
}

/**
 * Reads the `---` header shared by charts and layers (ChartDown section 3), warns about
 * a version outside `supportedVersions` (R-00.4), and builds the instrument names
 * from the catalog plus the declared custom ids (R-00.1).
 */
export function readHeader(
  lines: readonly string[],
  supportedVersions: readonly string[],
  options: ParseOptions,
  warn: Warn,
): Header {
  const fields: Record<string, string> = {};
  const fieldLines: Record<string, number> = {};
  let bodyStart = 0;
  if (lines[0]?.trim() === "---") {
    // Without a closing ---, the header ends at the first section so nothing is lost.
    let end = lines.findIndex((text, i) => i > 0 && text.trim() === "---");
    const closed = end !== -1;
    if (!closed) {
      warn(1, "header-not-closed");
      end = lines.findIndex((text, i) => i > 0 && text.trim().startsWith("##"));
      if (end === -1) end = lines.length;
    }
    for (let index = 1; index < end; index++) {
      const text = lines[index] as string;
      const match = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(text);
      if (match) {
        const name = (match[1] as string).toLowerCase();
        fields[name] = (match[2] as string).trim();
        fieldLines[name] = index + 1;
      } else if (text.trim()) {
        warn(index + 1, "header-line");
      }
    }
    bodyStart = closed ? end + 1 : end;
  }

  const version = fields.chartdown;
  if (version !== undefined && !supportedVersions.includes(version)) {
    const first = supportedVersions[0];
    const last = supportedVersions[supportedVersions.length - 1];
    warn(fieldLines.chartdown ?? 1, "unsupported-version", {
      version,
      supported: first === last ? String(first) : `${first}–${last}`,
    });
  }
  const instruments = parseInstrumentsHeader(
    fields.instruments ?? "",
    fieldLines.instruments ?? 1,
    warn,
  );
  const roles = createRoleResolver(options.instruments ?? STANDARD_INSTRUMENTS, instruments);

  const header: Header = { fields, instruments, roles, bodyStart };
  if (version !== undefined) header.version = version;
  return header;
}

/** The passes in `2x` or `1x,3x`, before the instruments (spec 9.1). */
export const PASS_PREFIX = /^(\d+x(?:\s*,\s*\d+x)*)\s*(.*)$/i;
export const parsePasses = (text: string): number[] =>
  text.split(",").map((pass) => Number.parseInt(pass, 10));

/**
 * `> text`, `> MD: text`, `> MD <instruments>: text` or `> MD 2x <instruments>: text`, a note
 * for one pass of the section's repeat (ChartDown spec 4 and 9.1).
 */
export function parseNote(text: string, line: number, roles: RoleResolver, warn: Warn): Note {
  const match = /^MD(?:\s+([^:]+?))?\s*:\s*(.*)$/i.exec(text);
  if (!match) return { md: false, roles: [EVERYONE], passes: [], text, line };
  const [, written, noteText = ""] = match;
  let names = written ?? "";
  let passes: number[] = [];
  const pass = PASS_PREFIX.exec(names);
  if (pass) {
    passes = parsePasses(pass[1] as string);
    names = (pass[2] as string).trim();
  }
  let noteRoles = [EVERYONE];
  if (names) {
    const resolved = roles(names);
    if (resolved) noteRoles = resolved;
    else warn(line, "unknown-instrument", { name: names });
  }
  return { md: true, roles: noteRoles, passes, text: noteText, line };
}
