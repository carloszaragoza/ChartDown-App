-- T-708: a set's optional time of day (R-05.1, Technical Plan 4): the band's local time as
-- written, with no time zone, and only with a date. Rolled back by ../rollbacks/<same name>.
alter table public.sets add column time time without time zone;
alter table public.sets add constraint sets_time_needs_date check (time is null or date is not null);
grant update (time) on public.sets to authenticated;
