-- Rolls back ../migrations/20261005070000_catalog.sql.
drop function if exists public.catalog(text, public.source_type, integer);
