-- Rolls back ../migrations/20261005050000_fork.sql.
drop function if exists public.fork_version(uuid);
