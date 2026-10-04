-- T-305 tests (pgTAP): every important change writes an event; notices and preferences
-- belong to their person. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

create function pg_temp.login(person uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', person, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
-- The events of one type, as the server process will read them.
create function pg_temp.events(kind text) returns setof jsonb language sql as $$
  select detail from public.event_outbox where type::text = kind order by id;
$$;

select has_table('public', 'event_outbox', 'event_outbox exists');
select has_table('public', 'notifications', 'notifications exists');
select has_table('public', 'notification_prefs', 'notification_prefs exists');
select enum_has_labels('public', 'notice_channel', '{in_app,email,whatsapp}'::name[], 'R-09.5 channels: in-app, email and WhatsApp');

-- Ana is MD of the Sunday Band; Ben plays in it.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b1', 'Ben');
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000000b001', 'Sunday Band');
insert into public.band_members (id, band_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'md'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'musician');
insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000000501', 'Open Road');
insert into public.versions (id, song_id, owner_id, author_name, source_type) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'own_arrangement'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'live');
insert into public.revisions (id, version_id, number, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 1, e'## Chorus\n4 | 1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', 1, e'## Verse\n1 | 4');
insert into public.layers (id, band_id, version_id)
  values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1');
insert into public.sets (id, band_id, name, date, type)
  values ('00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', 'Sunday 12', '2026-10-12', 'service');
insert into public.set_items (set_id, position, version_id, pinned_revision_id) values
  ('00000000-0000-0000-0000-000000005e01', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000005e01', 2, '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2');
-- Start the log clean: the setup's own revisions wrote events.
delete from public.event_outbox;

-- The changes, made by Ana.
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true); end $$;

insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select '00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa02', id
  from public.instruments where slug = 'keys';
select is(
  (select count(*)::int from pg_temp.events('set_lineup_added') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000b1'),
  1, 'R-09.1 adding a musician to a set writes an event'
);
select is(
  (select e ->> 'instrument_id' from pg_temp.events('set_lineup_added') e),
  (select id::text from public.instruments where slug = 'keys'),
  'R-09.1 the event says which instrument, in which set'
);
select is(
  (select actor_id::text from public.event_outbox order by id limit 1),
  '00000000-0000-0000-0000-0000000000a1', 'R-09.3 an event records who made the change'
);

delete from public.set_lineup where member_id = '00000000-0000-0000-0000-00000000aa02';
insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select '00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa02', id
  from public.instruments where slug = 'bass';
select is(
  (select count(*)::int from pg_temp.events('set_lineup_removed')) * 10 + (select count(*)::int from pg_temp.events('set_lineup_added')),
  12, 'R-09.1 changing a musician''s instrument writes what was removed and what was added'
);

insert into public.set_temp_md (set_id, band_id, member_id)
  values ('00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa02');
select results_eq(
  $$select e ->> 'user_id', e ->> 'until' from pg_temp.events('set_temp_md_appointed') e$$,
  $$values ('00000000-0000-0000-0000-0000000000b1', '2026-10-12')$$,
  'R-09.1 appointing a temporary MD writes an event with how long it lasts'
);

update public.set_items set set_key = 'A' where position = 1;
update public.set_items set set_key = 'Bb' where position = 1;
select results_eq(
  $$select e ->> 'old_key', e ->> 'new_key' from pg_temp.events('set_key_changed') e$$,
  $$values (null::text, 'A'), ('A', 'Bb')$$,
  'R-09.2 a key change writes the old and the new key'
);
update public.set_items set set_key = 'Bb' where position = 1;
select is((select count(*)::int from pg_temp.events('set_key_changed')), 2, 'R-09.2 setting the same key again writes nothing');

update public.set_items set position = case position when 1 then 2 else 1 end where set_id = '00000000-0000-0000-0000-000000005e01';
select results_eq(
  $$select e ->> 'version_id', (e ->> 'old_position') || '->' || (e ->> 'new_position') from pg_temp.events('set_order_changed') e order by 1$$,
  $$values ('00000000-0000-0000-0000-0000000000f1', '1->2'), ('00000000-0000-0000-0000-0000000000f2', '2->1')$$,
  'R-09.2 an order change writes each song''s old and new place'
);

insert into public.layer_notes (id, layer_id, version_id, section, text, anchored_revision_id)
  values ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Pad up an octave.', '00000000-0000-0000-0000-0000000000d1');
insert into public.layer_note_instruments (note_id, instrument_id) select '00000000-0000-0000-0000-00000000ab01', id from public.instruments where slug = 'keys';
select is((select count(*)::int from pg_temp.events('layer_note_added')), 0, 'a note''s event waits for the end of the transaction');
set constraints all immediate;
select is(
  (select e -> 'instrument_ids' from pg_temp.events('layer_note_added') e),
  (select jsonb_build_array(id) from public.instruments where slug = 'keys'),
  'R-09.2 a new note writes an event with the instruments it is for'
);
select is(
  (select (e ->> 'section') || '/' || (e ->> 'band_id') from pg_temp.events('layer_note_added') e),
  'Chorus/00000000-0000-0000-0000-00000000b001', 'R-09.2 the note''s event says where it is and for which band'
);

insert into public.revisions (version_id, number, content, author_id)
  values ('00000000-0000-0000-0000-0000000000f1', 2, e'## Chorus\n4 | 5', '00000000-0000-0000-0000-0000000000a1');
select results_eq(
  $$select e ->> 'version_id', (e ->> 'number')::int from pg_temp.events('revision_added') e$$,
  $$values ('00000000-0000-0000-0000-0000000000f1', 2)$$,
  'R-09.4 a new revision writes an event'
);

update public.sets set name = 'Sunday 12 (morning)' where id = '00000000-0000-0000-0000-000000005e01';
update public.layers set hide_author_notes = true;
select is((select count(*)::int from public.event_outbox), 10, 'changes that are not important write no event');

-- Closed to the API.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select is((select count(*)::int from public.event_outbox), 0, 'nobody reads the event log through the API');
select throws_ok(
  $$insert into public.event_outbox (type, detail) values ('revision_added', '{}')$$,
  '42501', null, 'nobody writes the event log through the API'
);
do $$ begin perform pg_temp.logout(); end $$;
select ok(
  not has_function_privilege('authenticated', 'private.log_event(public.event_type, jsonb)', 'execute'),
  'the event functions cannot be called through the API'
);

-- Notices: the server process creates them; each person reads and marks only their own.
insert into public.notifications (id, user_id, type, detail) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'new_revision', '{"version_id":"f1"}'),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000b1', 'added_to_set', '{"set_id":"5e01"}');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select results_eq('select type from public.notifications', array['added_to_set'], 'R-09.3 a person reads only their own notices');
select results_eq(
  $$with changed as (update public.notifications set read_at = now() where id = '00000000-0000-0000-0000-00000000c002' returning 1)
    select count(*)::int from changed$$,
  array[1], 'R-09.3 a person marks their notice read'
);
select results_eq(
  $$with changed as (update public.notifications set read_at = now() where id = '00000000-0000-0000-0000-00000000c001' returning 1)
    select count(*)::int from changed$$,
  array[0], 'R-09.3 nobody marks someone else''s notice'
);
select throws_ok(
  $$update public.notifications set detail = '{}' where id = '00000000-0000-0000-0000-00000000c002'$$,
  '42501', null, 'R-09.3 a notice says what changed and nobody rewrites it'
);
select throws_ok(
  $$insert into public.notifications (user_id, type, detail) values ('00000000-0000-0000-0000-0000000000b1', 'added_to_set', '{}')$$,
  '42501', null, 'R-09.3 notices are created only by the server process'
);

-- Preferences (R-09.5).
select lives_ok(
  $$insert into public.notification_prefs (user_id, type, channel, active)
    values ('00000000-0000-0000-0000-0000000000b1', 'set_order_changed', 'in_app', false)$$,
  'R-09.5 a person turns a notice off'
);
select throws_ok(
  $$insert into public.notification_prefs (user_id, type, channel, active)
    values ('00000000-0000-0000-0000-0000000000a1', 'new_revision', 'in_app', false)$$,
  '42501', null, 'R-09.5 nobody changes someone else''s preferences'
);
select results_eq(
  $$with changed as (update public.notification_prefs set active = true returning 1) select count(*)::int from changed$$,
  array[1], 'R-09.5 a person turns a notice back on'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select is((select count(*)::int from public.notification_prefs), 0, 'R-09.5 preferences are private to their person');

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
