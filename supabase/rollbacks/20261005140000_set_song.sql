-- Rolls back ../migrations/20261005140000_set_song.sql.
drop function if exists public.set_song(uuid, integer);
