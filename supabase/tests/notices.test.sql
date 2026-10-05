-- T-1001 tests (pgTAP): each event becomes notices for the people affected, saying what changed,
-- when the change is saved. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Who makes the next change (the role stays the owner's, as the server's own writes do).
create function pg_temp.as_person(person uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', person, 'role', 'authenticated')::text, true);
end $$;
-- The end of a change: the notices are made then. A test runs in one transaction, so it asks.
create function pg_temp.save() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints all deferred;
end $$;
-- One person's notices of one kind.
create function pg_temp.notices(person uuid, kind text) returns setof jsonb language sql as $$
  select detail from public.notifications where user_id = person and type = kind order by detail::text;
$$;

-- Ana is MD of the Sunday Band; Luis plays bass, Ben keys, Carla has no default instrument.
-- Dana wrote the version the band plays.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000001a1', 'ana@example.test'),
  ('00000000-0000-0000-0000-0000000001b1', 'luis@example.test'),
  ('00000000-0000-0000-0000-0000000001c1', 'ben@example.test'),
  ('00000000-0000-0000-0000-0000000001d1', 'carla@example.test'),
  ('00000000-0000-0000-0000-0000000001e1', 'dana@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000001a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000001b1', 'Luis'),
  ('00000000-0000-0000-0000-0000000001c1', 'Ben'),
  ('00000000-0000-0000-0000-0000000001d1', 'Carla'),
  ('00000000-0000-0000-0000-0000000001e1', 'Dana')
  on conflict (id) do update set name = excluded.name;
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000001b001', 'Sunday Band');
insert into public.band_members (id, band_id, user_id, role) values
  ('00000000-0000-0000-0000-00000001aa01', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-0000000001a1', 'md'),
  ('00000000-0000-0000-0000-00000001aa02', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-0000000001b1', 'musician'),
  ('00000000-0000-0000-0000-00000001aa03', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-0000000001c1', 'musician'),
  ('00000000-0000-0000-0000-00000001aa04', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-0000000001d1', 'musician');
insert into public.member_instruments (member_id, instrument_id)
  select '00000000-0000-0000-0000-00000001aa02', id from public.instruments where slug = 'bass'
  union all select '00000000-0000-0000-0000-00000001aa03', id from public.instruments where slug = 'keys';
insert into public.songs (id, title) values
  ('00000000-0000-0000-0000-000000010501', 'Open Road'),
  ('00000000-0000-0000-0000-000000010502', 'Harbor Lights');
insert into public.versions (id, song_id, owner_id, author_name, source_type) values
  ('00000000-0000-0000-0000-0000000100f1', '00000000-0000-0000-0000-000000010501', '00000000-0000-0000-0000-0000000001e1', 'Dana', 'own_arrangement'),
  ('00000000-0000-0000-0000-0000000100f2', '00000000-0000-0000-0000-000000010502', '00000000-0000-0000-0000-0000000001e1', 'Dana', 'live');
insert into public.revisions (id, version_id, number, content) values
  ('00000000-0000-0000-0000-0000000100d1', '00000000-0000-0000-0000-0000000100f1', 1, e'## Chorus\n4 | 1'),
  ('00000000-0000-0000-0000-0000000100d2', '00000000-0000-0000-0000-0000000100f2', 1, e'## Verse\n1 | 4');
insert into public.layers (id, band_id, version_id)
  values ('00000000-0000-0000-0000-0000000101a1', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-0000000100f1');
insert into public.sets (id, band_id, name, date, time, type)
  values ('00000000-0000-0000-0000-000000015e01', '00000000-0000-0000-0000-00000001b001', 'Sunday 12', '2026-10-12', '10:30', 'service');
insert into public.set_items (set_id, position, version_id, pinned_revision_id) values
  ('00000000-0000-0000-0000-000000015e01', 1, '00000000-0000-0000-0000-0000000100f1', '00000000-0000-0000-0000-0000000100d1'),
  ('00000000-0000-0000-0000-000000015e01', 2, '00000000-0000-0000-0000-0000000100f2', '00000000-0000-0000-0000-0000000100d2');
select pg_temp.save();
delete from public.notifications;

-- Lineup and temporary MD (R-09.1), by Ana.
select pg_temp.as_person('00000000-0000-0000-0000-0000000001a1');
insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select '00000000-0000-0000-0000-000000015e01', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-00000001aa02', id
  from public.instruments where slug = 'bass';
select is((select count(*)::int from public.notifications), 0, 'R-09.1 a notice is made when the change is saved, not before');
select pg_temp.save();
select results_eq(
  $$select * from pg_temp.notices('00000000-0000-0000-0000-0000000001b1', 'lineup_added')$$,
  $$values ('{"set_id":"00000000-0000-0000-0000-000000015e01","set_name":"Sunday 12","date":"2026-10-12","time":"10:30:00","instrument":"bass"}'::jsonb)$$,
  'R-09.1 Luis added as bassist is told the set''s name, date and time and his instrument'
);
select is(
  (select count(*)::int from public.event_outbox where processed_at is null), 0,
  'R-09.1 each event is marked processed once its notices are made'
);

delete from public.set_lineup where member_id = '00000000-0000-0000-0000-00000001aa02';
select pg_temp.save();
select is(
  (select n ->> 'set_name' || '/' || (n ->> 'instrument') from pg_temp.notices('00000000-0000-0000-0000-0000000001b1', 'lineup_removed') n),
  'Sunday 12/bass', 'R-09.1 Luis taken off the set is told which set and instrument'
);

insert into public.set_temp_md (set_id, band_id, member_id)
  values ('00000000-0000-0000-0000-000000015e01', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-00000001aa03');
select pg_temp.save();
select is(
  (select n ->> 'set_name' || ' until ' || (n ->> 'until') from pg_temp.notices('00000000-0000-0000-0000-0000000001c1', 'temp_md') n),
  'Sunday 12 until 2026-10-12', 'R-09.1 Ben appointed temporary MD is told for which set and until when'
);

-- Key and order (R-09.2).
update public.set_items set set_key = 'Bb' where position = 1;
select pg_temp.save();
select results_eq(
  $$select n ->> 'title', n ->> 'old_key', n ->> 'new_key' from pg_temp.notices('00000000-0000-0000-0000-0000000001b1', 'key_changed') n$$,
  $$values ('Open Road', null::text, 'Bb')$$,
  'R-09.2 R-09.3 a key change tells the song, the old key and the new one'
);
select is(
  (select count(distinct user_id)::int from public.notifications where type = 'key_changed'), 3,
  'R-09.2 every member of the set''s band hears of a key change'
);
select is(
  (select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-0000000001a1'), 0,
  'R-09.3 nobody is notified of their own change'
);

update public.set_items set position = case position when 1 then 2 else 1 end where set_id = '00000000-0000-0000-0000-000000015e01';
select pg_temp.save();
select results_eq(
  $$select user_id, count(*)::int from public.notifications where type = 'order_changed' group by user_id order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000001b1'::uuid, 1), ('00000000-0000-0000-0000-0000000001c1'::uuid, 1), ('00000000-0000-0000-0000-0000000001d1'::uuid, 1)$$,
  'R-09.2 an order change is one notice per person, however many songs moved'
);

-- Notes (R-09.2): whoever plays the note's instruments, by default or in a set's lineup.
insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select '00000000-0000-0000-0000-000000015e01', '00000000-0000-0000-0000-00000001b001', '00000000-0000-0000-0000-00000001aa04', id
  from public.instruments where slug = 'guitar';
insert into public.layer_notes (id, layer_id, version_id, section, bar, text, anchored_revision_id, created_by) values
  ('00000000-0000-0000-0000-00000001ab01', '00000000-0000-0000-0000-0000000101a1', '00000000-0000-0000-0000-0000000100f1', 'Chorus', 2, 'Walk up to the 4.', '00000000-0000-0000-0000-0000000100d1', '00000000-0000-0000-0000-0000000001a1'),
  ('00000000-0000-0000-0000-00000001ab02', '00000000-0000-0000-0000-0000000101a1', '00000000-0000-0000-0000-0000000100f1', 'Chorus', null, 'Let it ring.', '00000000-0000-0000-0000-0000000100d1', '00000000-0000-0000-0000-0000000001a1'),
  ('00000000-0000-0000-0000-00000001ab03', '00000000-0000-0000-0000-0000000101a1', '00000000-0000-0000-0000-0000000100f1', 'Chorus', null, 'Everyone builds.', '00000000-0000-0000-0000-0000000100d1', '00000000-0000-0000-0000-0000000001a1');
insert into public.layer_note_instruments (note_id, instrument_id)
  select '00000000-0000-0000-0000-00000001ab01', id from public.instruments where slug = 'bass'
  union all select '00000000-0000-0000-0000-00000001ab02', id from public.instruments where slug = 'guitar';
select pg_temp.save();
select results_eq(
  $$select n ->> 'title', n ->> 'section', (n ->> 'bar')::int, n ->> 'text', n -> 'instruments' from pg_temp.notices('00000000-0000-0000-0000-0000000001b1', 'note_added') n where n ->> 'text' = 'Walk up to the 4.'$$,
  $$values ('Open Road', 'Chorus', 2, 'Walk up to the 4.', '["bass"]'::jsonb)$$,
  'R-09.2 R-09.3 a note for bass reaches the bassist with the song, section, bar and text'
);
select results_eq(
  $$select u.name, n.detail ->> 'text' from public.notifications n join public.profiles u on u.id = n.user_id
    where n.type = 'note_added' order by 1, 2$$,
  $$values ('Ben', 'Everyone builds.'), ('Carla', 'Everyone builds.'), ('Carla', 'Let it ring.'),
           ('Luis', 'Everyone builds.'), ('Luis', 'Walk up to the 4.')$$,
  'R-09.2 a note reaches only who plays its instruments in the band (a set''s lineup counts), a general note everyone'
);

-- A new revision from the version's author (R-09.4), by Dana.
select pg_temp.as_person('00000000-0000-0000-0000-0000000001e1');
insert into public.revisions (version_id, number, content, author_id)
  values ('00000000-0000-0000-0000-0000000100f1', 2, e'## Chorus\n4 | 5', '00000000-0000-0000-0000-0000000001e1');
select pg_temp.save();
select results_eq(
  $$select user_id, detail ->> 'set_name', detail ->> 'title', (detail ->> 'number')::int, (detail ->> 'pinned_number')::int
    from public.notifications where type = 'new_revision'$$,
  $$values ('00000000-0000-0000-0000-0000000001a1'::uuid, 'Sunday 12', 'Open Road', 2, 1)$$,
  'R-09.4 only the MD hears of a new revision, with what the set still plays'
);

-- A notice the person turned off is not made (R-09.5).
select pg_temp.as_person('00000000-0000-0000-0000-0000000001a1');
insert into public.notification_prefs (user_id, type, channel, active)
  values ('00000000-0000-0000-0000-0000000001b1', 'key_changed', 'in_app', false);
update public.set_items set set_key = 'C' where version_id = '00000000-0000-0000-0000-0000000100f1';
select pg_temp.save();
select is(
  (select count(*)::int from pg_temp.notices('00000000-0000-0000-0000-0000000001b1', 'key_changed')), 1,
  'R-09.5 a notice Luis turned off is not made'
);
select is(
  (select count(*)::int from pg_temp.notices('00000000-0000-0000-0000-0000000001c1', 'key_changed')), 2,
  'R-09.5 the others still receive it'
);

-- What a notice says is kept (R-09.3).
update public.sets set name = 'Sunday 12 (morning)' where id = '00000000-0000-0000-0000-000000015e01';
select is(
  (select count(*)::int from public.notifications where detail ->> 'set_name' = 'Sunday 12 (morning)'), 0,
  'R-09.3 renaming a set later does not change what earlier notices say'
);

-- An account deleted in the same change (its lineup goes with it) gets nothing and stops nothing.
delete from auth.users where id = '00000000-0000-0000-0000-0000000001d1';
select lives_ok('select pg_temp.save()', 'R-09.1 deleting an account that was in a lineup still saves');

select ok(
  not has_function_privilege('authenticated', 'private.process_event()', 'execute')
  and not has_function_privilege('authenticated', 'private.notify(uuid, text, jsonb, public.event_outbox)', 'execute'),
  'the notice functions cannot be called through the API'
);

select * from finish();
rollback;
