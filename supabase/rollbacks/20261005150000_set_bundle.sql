-- Rolls back ../migrations/20261005150000_set_bundle.sql.
drop function if exists public.set_bundle(uuid);
