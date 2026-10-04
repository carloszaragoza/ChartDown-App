# supabase

Postgres schema, row-level security policies and server functions for ChartDown App (Technical Plan 3 and 4). Environments are in [docs/infrastructure.md](../docs/infrastructure.md).

- `migrations/`: the schema, applied in order. Every table has row-level security from its first migration, closed until its policies exist (T-304).
- `rollbacks/`: one file per migration, with the same name, that undoes it. Supabase only applies migrations forward; these let CI prove each one rolls back cleanly.
- `tests/`: pgTAP tests (`supabase test db`).
- `scripts/rollback-check.sh`: rolls every migration back in reverse, checks nothing of ours is left, and applies them again.
- `functions/`: server functions, from T-801.

## Running the database tests

They need Docker (Docker Desktop or OrbStack) and the Supabase CLI:

```sh
pnpm db:start   # local Postgres and auth
pnpm db:test    # schema tests, rollback check, schema tests again
```

CI runs the same steps in the Database job on every pull request.

## Applying migrations

Development (`chartdown-dev`, linked): `npx supabase db push`. Production waits until a feature uses the database.
