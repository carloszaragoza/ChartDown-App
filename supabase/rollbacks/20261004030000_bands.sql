-- Rolls back ../migrations/20261004030000_bands.sql: drops what it created, in reverse.
drop trigger if exists profiles_personal_space on public.profiles;
drop function if exists public.create_personal_space();
drop table if exists public.member_instruments;
drop table if exists public.band_members;
drop function if exists public.personal_band_only_owner();
drop table if exists public.bands;
drop function if exists public.personal_owner_is_fixed();
drop type if exists public.band_role;
