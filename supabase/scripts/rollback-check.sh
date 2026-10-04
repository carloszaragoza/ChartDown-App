#!/usr/bin/env bash
# Checks that the migrations roll back cleanly and apply again (T-301, Technical Plan 4):
# every migration has a rollback; rolling back in reverse leaves none of our tables or
# types; applying the migrations again works. Run against a local Supabase (supabase start).
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")/.."

run() { psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$1"; }
ours() {
  psql "$DB_URL" -At -c "select
    (select count(*) from pg_tables where schemaname = 'public')
    + (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public' and t.typtype = 'e')"
}

migrations=(migrations/*.sql)
for migration in "${migrations[@]}"; do
  [ -f "rollbacks/$(basename "$migration")" ] || { echo "✗ No rollback for $migration"; exit 1; }
done

for ((i = ${#migrations[@]} - 1; i >= 0; i--)); do
  run "rollbacks/$(basename "${migrations[$i]}")"
done
left=$(ours)
[ "$left" = "0" ] || { echo "✗ Rolling back left $left tables or types in public"; exit 1; }
echo "✓ Rolled back ${#migrations[@]} migration(s): nothing left in public"

for migration in "${migrations[@]}"; do run "$migration"; done
echo "✓ Applied ${#migrations[@]} migration(s) again"
