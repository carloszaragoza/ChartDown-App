-- T-1002 tests (pgTAP): notices are published to Realtime, which keeps each person's to them.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'),
  'R-09.3 new notices are sent to the open app as they are made'
);
select ok(
  not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('event_outbox', 'notification_prefs')
  ),
  'R-09.3 only notices are published, never the event log or anyone''s preferences'
);

select * from finish();
rollback;
