-- Rolls back ../migrations/20261005120000_update_pinned.sql.
drop function if exists public.update_pinned_revision(uuid);
