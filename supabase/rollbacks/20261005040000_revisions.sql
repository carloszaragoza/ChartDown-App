-- Rolls back ../migrations/20261005040000_revisions.sql.
drop function if exists public.restore_revision(uuid);
drop function if exists public.save_revision(uuid, text);
