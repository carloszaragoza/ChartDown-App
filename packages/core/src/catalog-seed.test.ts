import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STANDARD_INSTRUMENTS } from "./roles.js";

// The database's starting instrument list (supabase/migrations) must match the parser's
// standard roles, so a chart reads the same with or without the Admin's catalog (R-00.1, R-07.3).
const migrations = new URL("../../../supabase/migrations/", import.meta.url);
const seed = readdirSync(migrations)
  .map((file) => readFileSync(new URL(file, migrations), "utf8"))
  .join("\n");

const seeded = Array.from(
  seed.matchAll(/\('([a-z0-9-]+)', '[^']+', '[^']+', '\{([^}]*)\}'\)/g),
  ([, id, aliases = ""]) => ({
    id,
    names: aliases.split(","),
  }),
);

describe("R-00.1 the Admin's starting catalog", () => {
  it("R-00.1 the database seeds the parser's standard instruments with the same names", () => {
    expect(seeded).toEqual(STANDARD_INSTRUMENTS.map(({ id, names }) => ({ id, names })));
  });
});
