-- Rolls back ../migrations/20261005020000_delete_account.sql. The 'band_md_changed' event type
-- stays: Postgres cannot drop an enum value (the events rollback drops the whole type).
drop function if exists public.delete_my_account(text);
