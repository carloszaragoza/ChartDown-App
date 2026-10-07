-- Rolls back ../migrations/20261007120000_version_usage.sql.
drop function if exists public.version_usage(integer);
