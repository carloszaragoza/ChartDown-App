-- Rolls back ../migrations/20261005100000_sets.sql.
drop function if exists public.duplicate_set(uuid, text, date);
drop function if exists public.remove_from_set(uuid);
drop function if exists public.move_in_set(uuid, integer);
drop function if exists public.add_to_set(uuid, uuid);
