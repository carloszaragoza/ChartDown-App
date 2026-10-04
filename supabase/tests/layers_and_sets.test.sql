-- T-303 tests (pgTAP): the MD layer and its notes; sets, items, lineup and temporary MD.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_table('public', 'layers', 'layers exists');
select has_table('public', 'layer_notes', 'layer_notes exists');
select has_table('public', 'layer_note_instruments', 'layer_note_instruments exists');
select has_table('public', 'sets', 'sets exists');
select has_table('public', 'set_items', 'set_items exists');
select has_table('public', 'set_lineup', 'set_lineup exists');
select has_table('public', 'set_temp_md', 'set_temp_md exists');
select enum_has_labels('public', 'set_type', '{rehearsal,service,concert}'::name[], 'R-05.1 a set is a rehearsal, a service or a concert');

-- Ana is MD of the Sunday Band, Ben plays in it; Cleo is MD of another band.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b1', 'Ben'),
  ('00000000-0000-0000-0000-0000000000c1', 'Cleo')
  on conflict (id) do update set name = excluded.name;
insert into public.bands (id, name) values
  ('00000000-0000-0000-0000-00000000b001', 'Sunday Band'),
  ('00000000-0000-0000-0000-00000000b002', 'Friday Trio');
insert into public.band_members (id, band_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'md'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'musician'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000c1', 'md');

-- Two versions of a song, with revisions.
insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000000001', 'Open Road');
insert into public.versions (id, song_id, author_name, source_type) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', 'Ana', 'own_arrangement'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000001', 'Cleo', 'live');
insert into public.revisions (id, version_id, number, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 1, e'## Chorus\n4 | 1 | 5 | 6m'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f1', 2, e'## Chorus\n4 | 1 | 5 | 1'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000f2', 1, e'## Verse\n1 | 4');

-- Layers (decision 9.1, R-06.6).
select lives_ok(
  $$insert into public.layers (id, band_id, version_id)
    values ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1')$$,
  'R-06.6 a band has a layer on a version'
);
select throws_ok(
  $$insert into public.layers (band_id, version_id)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1')$$,
  '23505', null, 'R-06.6 one layer per band and version'
);
select lives_ok(
  $$insert into public.layers (band_id, version_id)
    values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f1')$$,
  'R-06.6 another band keeps its own layer on the same version'
);

-- Layer notes (R-06.2, R-00.2).
insert into public.layer_notes (id, layer_id, version_id, section, text, anchored_revision_id) values
  ('00000000-0000-0000-0000-000000000ab1', '00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Open it up.', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000000ab2', '00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Roots only.', '00000000-0000-0000-0000-0000000000d2');
insert into public.layer_note_instruments (note_id, instrument_id)
  select '00000000-0000-0000-0000-000000000ab2', id from public.instruments where slug in ('bass', 'keys');
select is(
  (select count(*)::int from public.layer_note_instruments where note_id = '00000000-0000-0000-0000-000000000ab1'),
  0, 'R-06.2 a note with no instruments is for everyone'
);
select is(
  (select count(*)::int from public.layer_note_instruments where note_id = '00000000-0000-0000-0000-000000000ab2'),
  2, 'R-06.2 a note can be for several instruments'
);
select throws_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, text, anchored_revision_id)
    values ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000f1', 'Verse', 'x', '00000000-0000-0000-0000-0000000000d3')$$,
  '23503', null, 'R-00.2 a note is anchored to a revision of its layer''s version'
);
select throws_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, occurrence, text, anchored_revision_id)
    values ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 0, 'x', '00000000-0000-0000-0000-0000000000d1')$$,
  '23514', null, 'R-00.2 an occurrence starts at 1'
);
select throws_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, bar, text, anchored_revision_id)
    values ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 0, 'x', '00000000-0000-0000-0000-0000000000d1')$$,
  '23514', null, 'R-00.2 a bar starts at 1'
);

-- Sets (decision 8, R-05.1).
insert into public.sets (id, band_id, name, date, type)
  values ('00000000-0000-0000-0000-000000005e71', '00000000-0000-0000-0000-00000000b001', 'Sunday 12', '2026-10-12', 'service');
select throws_ok(
  $$insert into public.sets (band_id, name, type) values ('00000000-0000-0000-0000-00000000b001', '  sunday 12 ', 'rehearsal')$$,
  '23505', null, 'R-05.1 a set name repeated within the band is refused, whatever its case'
);
select lives_ok(
  $$insert into public.sets (band_id, name, type) values ('00000000-0000-0000-0000-00000000b002', 'Sunday 12', 'service')$$,
  'R-05.1 another band can use the same set name'
);
select throws_ok(
  $$insert into public.sets (band_id, name) values ('00000000-0000-0000-0000-00000000b001', 'No type')$$,
  '23502', null, 'R-05.1 a set has a type'
);

-- Set items (decision 9.2, R-05.2, R-05.4).
select lives_ok(
  $$insert into public.set_items (set_id, position, version_id, pinned_revision_id) values
    ('00000000-0000-0000-0000-000000005e71', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
    ('00000000-0000-0000-0000-000000005e71', 2, '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d3')$$,
  'R-05.2 songs are added to a set in order, each pinned to a revision'
);
select throws_ok(
  $$insert into public.set_items (set_id, position, version_id, pinned_revision_id)
    values ('00000000-0000-0000-0000-000000005e71', 2, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2')$$,
  '23505', null, 'R-05.2 two songs cannot share a place in the set'
);
select throws_ok(
  $$insert into public.set_items (set_id, position, version_id, pinned_revision_id)
    values ('00000000-0000-0000-0000-000000005e71', 3, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d3')$$,
  '23503', null, 'R-05.2 a song is pinned to a revision of its own version'
);
select lives_ok(
  $$update public.set_items set position = case position when 1 then 2 else 1 end
    where set_id = '00000000-0000-0000-0000-000000005e71'$$,
  'R-05.2 the MD can reorder the songs of a set'
);
select lives_ok(
  $$update public.set_items set set_key = 'Bbm' where set_id = '00000000-0000-0000-0000-000000005e71' and position = 1$$,
  'R-05.4 a song can have its own key in the set'
);
select throws_ok(
  $$update public.set_items set set_key = 'H' where set_id = '00000000-0000-0000-0000-000000005e71' and position = 1$$,
  '23514', null, 'R-05.4 a set key is a key name'
);

-- Lineup (R-05.3).
select lives_ok(
  $$insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
    select '00000000-0000-0000-0000-000000005e71', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000e2', id
    from public.instruments where slug in ('keys', 'vocals')$$,
  'R-05.3 a musician plays one or more instruments in a set'
);
select throws_ok(
  $$insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
    select '00000000-0000-0000-0000-000000005e71', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000e3', id
    from public.instruments where slug = 'bass'$$,
  '23503', null, 'R-05.3 only members of the set''s band are in its lineup'
);

-- Temporary MD (decision 2, R-05.5).
select lives_ok(
  $$insert into public.set_temp_md (set_id, band_id, member_id)
    values ('00000000-0000-0000-0000-000000005e71', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000e2')$$,
  'R-05.5 the MD appoints a member as temporary MD of a set'
);
select is(
  (select until from public.set_temp_md where set_id = '00000000-0000-0000-0000-000000005e71'),
  '2026-10-12'::date, 'R-05.5 the temporary MD lasts until the set''s date'
);
select throws_ok(
  $$insert into public.set_temp_md (set_id, band_id, member_id)
    values ('00000000-0000-0000-0000-000000005e71', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000e1')$$,
  '23505', null, 'R-05.5 a set has one temporary MD'
);
select throws_ok(
  $$insert into public.set_temp_md (set_id, band_id, member_id)
    select id, band_id, '00000000-0000-0000-0000-0000000000e1' from public.sets
    where band_id = '00000000-0000-0000-0000-00000000b002'$$,
  '23503', null, 'R-05.5 the temporary MD is a member of the set''s band'
);

-- A member who leaves loses their places in the band's sets (R-04.4).
delete from public.band_members where id = '00000000-0000-0000-0000-0000000000e2';
select is(
  (select count(*)::int from public.set_lineup where member_id = '00000000-0000-0000-0000-0000000000e2')
    + (select count(*)::int from public.set_temp_md where member_id = '00000000-0000-0000-0000-0000000000e2'),
  0, 'R-04.4 a member who leaves is removed from lineups and as temporary MD'
);

-- Deleting a layer deletes its notes.
delete from public.layers where id = '00000000-0000-0000-0000-0000000000aa';
select is(
  (select count(*)::int from public.layer_notes where layer_id = '00000000-0000-0000-0000-0000000000aa'),
  0, 'a layer''s notes go with it'
);

-- Closed to the API until T-304; the trigger function is not callable.
set local role authenticated;
do $$ begin perform set_config('test.seen',
  ((select count(*) from public.layers) + (select count(*) from public.sets) + (select count(*) from public.set_items))::text, true); end $$;
reset role;
select is(current_setting('test.seen'), '0', 'a signed-in user reads no layers or sets yet');
select ok(
  not has_function_privilege('authenticated', 'public.temp_md_until_set_date()', 'execute'),
  'the trigger function cannot be called through the API'
);

select * from finish();
rollback;
