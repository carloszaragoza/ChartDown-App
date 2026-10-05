-- Rolls back ../migrations/20261005110000_set_lineup.sql.
drop function if exists public.save_lineup(uuid, jsonb);
