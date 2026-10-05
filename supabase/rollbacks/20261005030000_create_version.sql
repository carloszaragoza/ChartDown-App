-- Rolls back ../migrations/20261005030000_create_version.sql.
drop function if exists public.create_version(uuid, text, text[], text, text, public.source_type, text, smallint, text);
