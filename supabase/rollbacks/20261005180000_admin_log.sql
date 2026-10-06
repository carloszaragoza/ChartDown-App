-- Rolls back ../migrations/20261005180000_admin_log.sql.
drop trigger if exists invite_codes_admin_log on public.invite_codes;
drop trigger if exists instruments_admin_log on public.instruments;
drop function if exists private.on_invite_code_admin();
drop function if exists private.on_instrument_admin();
drop function if exists private.log_admin(text, text, text, jsonb);
drop table if exists public.admin_log;
