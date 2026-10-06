-- Rolls back ../migrations/20261005170000_notices_realtime.sql.
alter publication supabase_realtime drop table public.notifications;
