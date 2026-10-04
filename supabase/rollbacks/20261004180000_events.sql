-- Rolls back ../migrations/20261004180000_events.sql: drops what it created, in reverse.
drop trigger if exists revisions_events on public.revisions;
drop trigger if exists layer_notes_events on public.layer_notes;
drop trigger if exists set_items_events on public.set_items;
drop trigger if exists set_temp_md_events on public.set_temp_md;
drop trigger if exists set_lineup_events on public.set_lineup;
drop function if exists private.on_revision();
drop function if exists private.on_layer_note();
drop function if exists private.on_set_item_change();
drop function if exists private.on_set_temp_md();
drop function if exists private.on_set_lineup();
drop function if exists private.log_event(public.event_type, jsonb);
drop table if exists public.notification_prefs;
drop table if exists public.notifications;
drop table if exists public.event_outbox;
drop type if exists public.notice_channel;
drop type if exists public.event_type;
