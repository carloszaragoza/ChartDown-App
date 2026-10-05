-- Rolls back ../migrations/20261005130000_set_time.sql.
alter table public.sets drop column if exists time;
