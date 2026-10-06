-- Rolls back ../migrations/20261005160000_notices.sql.
drop trigger if exists event_outbox_notices on public.event_outbox;
drop function if exists private.process_event();
drop function if exists private.notify(uuid, text, jsonb, public.event_outbox);
drop function if exists private.wants_notice(uuid, text);
