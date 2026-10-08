import { describe, expect, it } from "vitest";
import {
  parse as parsePlayground,
  toJSON as playgroundJson,
} from "../fixtures/playground-parser.js";
import { toJSON } from "./json.js";
import { parse } from "./parse.js";
import { EXAMPLES, EXAMPLES_06, fixture, fixture06 } from "./test-helpers.js";
import type { ChartJson, CueJson } from "./json.js";
import type { WarningCode } from "./types.js";

// The playground's role ids, renamed to the catalog's ids in the port.
const ROLE = new Map([
  ["all", "everyone"],
  ["gtr", "guitar"],
  ["vox", "vocals"],
  ["sax", "saxophone"],
  ["tpt", "trumpet"],
  ["tbn", "trombone"],
  ["vln", "violin"],
]);
const role = (id: string) => ROLE.get(id) ?? id;

// Messages the port changed on purpose, mapped back to the playground's wording.
const PLAYGROUND_MESSAGES: Partial<Record<WarningCode, string>> = {
  "landmark-too-long": "Lyric landmarks should be 8 words or fewer", // T-106: says how many words
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The reference's JSON form with its role ids renamed, and its warnings as sorted messages. */
function reference(source: string) {
  const json = playgroundJson(parsePlayground(source));
  const cue = (c: CueJson) => ({ ...c, roles: c.roles.map(role) });
  return {
    ...json,
    sections: json.sections.map((section: any) => ({
      ...section,
      notes: section.notes.map((note: any) => ({ ...note, roles: note.roles.map(role) })),
      rows: section.rows.map((row: any) => ({
        ...row,
        bars: row.bars.map((bar: any) => ({ ...bar, cues: bar.cues.map(cue) })),
      })),
    })),
    // Line numbers are left out on purpose: the port fixes the playground's line 0 for header
    // and @use warnings.
    warnings: json.warnings.map((w: any) => w.message).sort(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function port(source: string) {
  const json: ChartJson = toJSON(parse(source));
  return {
    ...json,
    warnings: json.warnings
      .map((w) => PLAYGROUND_MESSAGES[w.code as WarningCode] ?? w.message)
      .sort(),
  };
}

describe("R-00.3 the TypeScript port matches the playground parser", () => {
  it.each([...EXAMPLES, "edge-cases"])(
    "R-00.3 port matches the playground parser on %s",
    (name) => {
      const source = fixture(name);
      expect(port(source)).toEqual(reference(source));
    },
  );
});

describe("R-00.10 the JSON form matches the playground parser on the 0.6 examples", () => {
  it.each(EXAMPLES_06)("R-00.10 the JSON form, play order and warnings match on %s", (name) => {
    const source = fixture06(name);
    expect(port(source)).toEqual(reference(source));
  });
});
