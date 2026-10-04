-- Rolls back ../migrations/20261004210000_user_instruments.sql.
drop table if exists public.user_instruments;
drop function if exists private.instrument_is_active();
