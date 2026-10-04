-- Rolls back ../migrations/20261004021500_catalog_tables.sql: drops what it created, in reverse.
alter table if exists public.versions drop constraint if exists versions_current_revision_fkey;
drop table if exists public.revisions;
drop table if exists public.versions;
drop table if exists public.songs;
drop table if exists public.instruments;
drop table if exists public.profiles;
drop type if exists public.source_type;
drop type if exists public.version_status;
drop type if exists public.visibility;
drop type if exists public.interface_language;
drop type if exists public.platform_role;
