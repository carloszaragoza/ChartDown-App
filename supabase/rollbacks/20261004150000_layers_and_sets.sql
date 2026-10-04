-- Rolls back ../migrations/20261004150000_layers_and_sets.sql: drops what it created, in reverse.
drop table if exists public.set_temp_md;
drop function if exists public.temp_md_until_set_date();
drop table if exists public.set_lineup;
drop table if exists public.set_items;
drop table if exists public.sets;
drop table if exists public.layer_note_instruments;
drop table if exists public.layer_notes;
drop table if exists public.layers;
alter table if exists public.band_members drop constraint if exists band_members_id_band_id_key;
drop type if exists public.set_type;
