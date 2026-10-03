import { describe, expect, it } from "vitest";
import { parse as parsePlayground } from "../fixtures/playground-parser.js";
import { parse } from "./parse.js";
import { EXAMPLES, fixture } from "./test-helpers.js";
import type { BarItem, Chart } from "./types.js";

// The playground's role ids, renamed to the spec's role names in the port.
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

function expandEnding(text: string): number[] {
  return text.split(",").flatMap((part) => {
    const [from, to = from] = part.split("-").map(Number) as [number, number?];
    return Array.from({ length: (to as number) - from + 1 }, (_, i) => from + i);
  });
}

// Both outputs in one shape. Warning line numbers are left out on purpose: the port
// fixes the playground's line 0 for header and @use warnings.
/* eslint-disable @typescript-eslint/no-explicit-any */
function fromPlayground(doc: any) {
  const item = (i: any) =>
    i.t === "chord"
      ? [i.root, i.q, i.bass ?? null, i.beats, i.explicit, i.push, i.hold, i.stab, i.ferm]
      : { nc: "no-chord", rep: "repeat-bar", tie: "tie" }[i.t as string];
  return {
    header: doc.meta,
    key: { root: doc.keyRoot, minor: doc.minor },
    sections: doc.sections.map((s: any) => ({
      name: s.name,
      notes: s.notes.map((n: any) => [n.md, n.roles.map(role), n.text]),
      rows: s.rows.map((r: any) => ({
        key: r.key ?? doc.keyRoot,
        keyChange: r.keyLabel ?? null,
        bars: r.bars.map((b: any) => ({
          items: b.items.map(item),
          dynamic: b.dyn ?? null,
          cues: b.cues.map((c: any) => [c.roles.map(role), c.text]),
          lyric: b.lyric ?? null,
          ending: b.ending ? expandEnding(b.ending) : null,
          repeatStart: Boolean(b.rs),
          repeatEnd: b.re ? b.times : null,
        })),
      })),
    })),
    warnings: doc.warnings.map((w: any) => w.msg).sort(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function fromPort(chart: Chart) {
  const item = (i: BarItem) =>
    i.type === "chord"
      ? [
          i.root,
          i.quality,
          i.bass ?? null,
          i.beats,
          i.explicitBeats,
          i.push,
          i.hold,
          i.stab,
          i.fermata,
        ]
      : i.type;
  return {
    header: chart.header,
    key: chart.key,
    sections: chart.sections.map((s) => ({
      name: s.name,
      notes: s.notes.map((n) => [n.md, n.roles, n.text]),
      rows: s.rows.map((r) => ({
        // The playground keeps only the root of a row's key and the label of a key change.
        key: r.key.root,
        keyChange: r.keyChange ? r.keyChange.root + (r.keyChange.minor ? "m" : "") : null,
        bars: r.bars.map((b) => ({
          items: b.items.map(item),
          dynamic: b.dynamic ?? null,
          cues: b.cues.map((c) => [c.roles, c.text]),
          lyric: b.lyric ?? null,
          ending: b.ending ?? null,
          repeatStart: b.repeatStart === true,
          repeatEnd: b.repeatEnd?.times ?? null,
        })),
      })),
    })),
    warnings: chart.warnings.map((w) => w.message).sort(),
  };
}

describe("R-00.3 the TypeScript port matches the playground parser", () => {
  it.each([...EXAMPLES, "edge-cases"])(
    "R-00.3 port matches the playground parser on %s",
    (name) => {
      const source = fixture(name);
      expect(fromPort(parse(source))).toEqual(fromPlayground(parsePlayground(source)));
    },
  );
});
