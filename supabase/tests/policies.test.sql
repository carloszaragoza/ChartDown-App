-- T-304 tests (pgTAP): row-level security, acting as each person through their JWT
-- (Technical Plan 8.1, the permission matrix, R-06.4). Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(57);

-- Acting as someone: the API's role plus the JWT claims auth.uid() reads.
create function pg_temp.login(person uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', person, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- The cast. Sunday Band: Ana (MD), Ben (keys), Carl (bass), Dora (temporary MD of one set).
-- Eve is MD of another band; Adam is an admin.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'carl@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'dora@example.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'eve@example.test'),
  ('00000000-0000-0000-0000-0000000000f1', 'adam@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b1', 'Ben'),
  ('00000000-0000-0000-0000-0000000000c1', 'Carl'),
  ('00000000-0000-0000-0000-0000000000d1', 'Dora'),
  ('00000000-0000-0000-0000-0000000000e1', 'Eve'),
  ('00000000-0000-0000-0000-0000000000f1', 'Adam')
  on conflict (id) do update set name = excluded.name;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000f1';

insert into public.bands (id, name) values
  ('00000000-0000-0000-0000-00000000b001', 'Sunday Band'),
  ('00000000-0000-0000-0000-00000000b002', 'Eve Band');
insert into public.band_members (id, band_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'md'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'musician'),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000c1', 'musician'),
  ('00000000-0000-0000-0000-00000000aa04', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000d1', 'musician'),
  ('00000000-0000-0000-0000-00000000aa05', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000e1', 'md');
insert into public.member_instruments (member_id, instrument_id)
  select '00000000-0000-0000-0000-00000000aa02'::uuid, id from public.instruments where slug = 'keys'
  union all
  select '00000000-0000-0000-0000-00000000aa03'::uuid, id from public.instruments where slug = 'bass';

-- Versions: V1 public (Ana), V2 private (Ana, used in her band's set), V3 private (Eve),
-- V4 public but hidden by an admin (Eve).
insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000000501', 'Open Road');
insert into public.versions (id, song_id, owner_id, author_name, visibility, status, source_type) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'active', 'own_arrangement'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'private', 'active', 'live'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000e1', 'Eve', 'private', 'active', 'studio'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000e1', 'Eve', 'public', 'hidden', 'studio');
insert into public.revisions (id, version_id, number, content) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 1, e'## Chorus\n4 | 1 | 5 | 6m'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000f1', 2, e'## Chorus\n4 | 1 | 5 | 1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', 1, e'## Verse\n1 | 4'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000f3', 1, e'## Verse\n5 | 1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000f4', 1, e'## Verse\n6m | 4');

-- Layers on V1: the Sunday Band's (notes for everyone, keys and bass) and Eve's band's.
insert into public.layers (id, band_id, version_id) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f1');
insert into public.layer_notes (id, layer_id, version_id, section, text, anchored_revision_id) values
  ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Everyone: open it up.', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000ab02', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Keys: pad up an octave.', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000ab03', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Bass: roots only.', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000ab04', '00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Eve band: big ending.', '00000000-0000-0000-0000-0000000000d1');
insert into public.layer_note_instruments (note_id, instrument_id)
  select '00000000-0000-0000-0000-00000000ab02'::uuid, id from public.instruments where slug = 'keys'
  union all
  select '00000000-0000-0000-0000-00000000ab03'::uuid, id from public.instruments where slug = 'bass';

-- Sets: S1 next week (Dora is temporary MD), S2 without a date, S3 yesterday (Dora was
-- temporary MD), S4 in Eve's band.
insert into public.sets (id, band_id, name, date, type) values
  ('00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', 'Next Sunday', current_date + 7, 'service'),
  ('00000000-0000-0000-0000-000000005e02', '00000000-0000-0000-0000-00000000b001', 'Rehearsal', null, 'rehearsal'),
  ('00000000-0000-0000-0000-000000005e03', '00000000-0000-0000-0000-00000000b001', 'Yesterday', current_date - 1, 'concert'),
  ('00000000-0000-0000-0000-000000005e04', '00000000-0000-0000-0000-00000000b002', 'Eve set', null, 'concert');
insert into public.set_items (set_id, position, version_id, pinned_revision_id) values
  ('00000000-0000-0000-0000-000000005e01', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000005e01', 2, '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-000000005e02', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000005e03', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1');
insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select '00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa02', id
  from public.instruments where slug = 'keys';
insert into public.set_temp_md (set_id, band_id, member_id) values
  ('00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa04'),
  ('00000000-0000-0000-0000-000000005e03', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa04');

-- Nothing is open by default.
select is(
  (select count(*)::int from pg_tables t where t.schemaname = 'public'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)),
  0, 'every table has policies'
);

-- A visitor (R-01.4, R-02.5).
do $$ begin perform pg_temp.visitor(); end $$;
select results_eq(
  'select id::text from public.versions order by id',
  array['00000000-0000-0000-0000-0000000000f1'],
  'R-01.4 a visitor reads the public catalog: not private, not hidden'
);
select is((select count(*)::int from public.versions where visibility = 'private'), 0, 'R-02.5 a visitor never reads a private version');
select is((select count(*)::int from public.revisions), 2, 'R-01.4 a visitor reads the revisions of public versions only');
select is((select count(*)::int from public.instruments), 9, 'R-01.4 a visitor reads the instrument catalog');
select is(
  (select count(*)::int from public.profiles) + (select count(*)::int from public.bands)
    + (select count(*)::int from public.layer_notes) + (select count(*)::int from public.sets),
  0, 'R-06.4 a visitor reads no people, bands, notes or sets'
);
select throws_ok($$insert into public.songs (title) values ('Mine')$$, '42501', null, 'R-01.4 a visitor cannot create anything');

-- Ben plays keys in the Sunday Band.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select results_eq(
  'select text from public.layer_notes order by text',
  array['Everyone: open it up.', 'Keys: pad up an octave.'],
  'R-06.4 a musician cannot read another instrument''s notes'
);
select is((select count(*)::int from public.layer_notes where text like 'Eve band%'), 0, 'R-06.4 a musician cannot read another band''s notes');
select is((select count(*)::int from public.layer_note_instruments), 1, 'R-06.4 a musician sees who their own notes are for, nothing more');
select is((select count(*)::int from public.versions where id = '00000000-0000-0000-0000-0000000000f2'), 1, 'R-05.2 band members read a private version their band plays');
select is((select count(*)::int from public.versions where id = '00000000-0000-0000-0000-0000000000f3'), 0, 'R-02.5 nobody else reads a private version');
select is((select count(*)::int from public.sets where band_id = '00000000-0000-0000-0000-00000000b001'), 3, 'a musician reads their band''s sets');
select results_eq(
  'select name from public.profiles order by name',
  array['Ana', 'Ben', 'Carl', 'Dora'],
  'R-01.2 a musician reads their bandmates, not strangers'
);
select throws_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, text, anchored_revision_id, created_by)
    values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Verse', 'Mine.', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'R-03.5 a musician cannot write the notes layer'
);
select is_empty(
  $$update public.versions set source_album = 'Other' where id = '00000000-0000-0000-0000-0000000000f1' returning id$$,
  'R-02.6 only the owner edits a version'
);
select throws_ok(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1'$$,
  '42501', null, 'R-01.3 nobody makes themselves an admin'
);
select isnt_empty(
  $$update public.profiles set name = 'Benjamin' where id = '00000000-0000-0000-0000-0000000000b1' returning id$$,
  'R-01.2 a person edits their own name'
);
select throws_ok(
  $$insert into public.instruments (slug, name_en, name_es) values ('cajon', 'Cajon', 'Cajón')$$,
  '42501', null, 'R-07.3 only an admin extends the instrument catalog'
);
select lives_ok(
  $$insert into public.versions (song_id, owner_id, author_name, source_type)
    values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000b1', 'Ben', 'live')$$,
  'R-02.3 a user creates a public version as themselves'
);
select throws_ok(
  $$insert into public.versions (song_id, owner_id, author_name, source_type)
    values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'live')$$,
  '42501', null, 'R-02.6 nobody creates a version in someone else''s name'
);
select throws_ok(
  $$insert into public.versions (song_id, owner_id, author_name, source_type, visibility)
    values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000b1', 'Ben', 'live', 'private')$$,
  '42501', null, 'R-02.3 a new version is public'
);
select throws_ok(
  $$insert into public.revisions (version_id, number, content, author_id)
    values ('00000000-0000-0000-0000-0000000000f1', 9, 'Mine', '00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'R-02.6 only the owner saves revisions of a version'
);

-- Carl plays bass.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select results_eq(
  'select text from public.layer_notes order by text',
  array['Bass: roots only.', 'Everyone: open it up.'],
  'R-06.2 the bass player reads the bass notes and everyone''s'
);

-- Dora is temporary MD of S1 (and was of S3, yesterday).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000d1'); end $$;
select results_eq(
  'select text from public.layer_notes order by text',
  array['Bass: roots only.', 'Everyone: open it up.', 'Keys: pad up an octave.'],
  'R-06.3 a temporary MD reads every note of the songs in their set'
);
select results_eq(
  $$with changed as (update public.set_items set position = case position when 1 then 2 else 1 end
    where set_id = '00000000-0000-0000-0000-000000005e01' returning 1) select count(*)::int from changed$$,
  array[2], 'R-05.5 a temporary MD reorders their set'
);
select results_eq(
  $$with changed as (update public.set_items set set_key = 'A'
    where set_id = '00000000-0000-0000-0000-000000005e01' and version_id = '00000000-0000-0000-0000-0000000000f1' returning 1)
    select count(*)::int from changed$$,
  array[1], 'R-05.5 a temporary MD changes keys in their set'
);
select lives_ok(
  $$insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
    select '00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa03', id
    from public.instruments where slug = 'bass'$$,
  'R-05.5 a temporary MD edits their set''s lineup'
);
select results_eq(
  $$with changed as (update public.set_items set set_key = 'G'
    where set_id = '00000000-0000-0000-0000-000000005e02' returning 1) select count(*)::int from changed$$,
  array[0], 'R-05.5 a temporary MD cannot edit another set'
);
select results_eq(
  $$with changed as (update public.set_items set set_key = 'G'
    where set_id = '00000000-0000-0000-0000-000000005e03' returning 1) select count(*)::int from changed$$,
  array[0], 'R-05.5 the temporary MD role ends with the set''s date'
);
select throws_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, text, anchored_revision_id, created_by)
    values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Verse', 'Mine.', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null, 'R-05.5 a temporary MD cannot write the notes layer'
);
select throws_ok(
  $$update public.set_items set pinned_revision_id = '00000000-0000-0000-0000-0000000000d5'
    where set_id = '00000000-0000-0000-0000-000000005e01' and version_id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'R-05.2 only the MD updates a song to another revision'
);
select throws_ok(
  $$insert into public.sets (band_id, name, type) values ('00000000-0000-0000-0000-00000000b001', 'Mine', 'rehearsal')$$,
  '42501', null, 'R-05.1 only the MD creates sets'
);

-- Eve, MD of another band.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000e1'); end $$;
select results_eq(
  'select text from public.layer_notes order by text',
  array['Eve band: big ending.'],
  'R-06.4 an MD reads their own band''s notes, never another band''s'
);
select is((select count(*)::int from public.sets where band_id = '00000000-0000-0000-0000-00000000b001'), 0, 'R-06.4 nobody outside a band reads its sets');
select results_eq('select name from public.profiles order by name', array['Eve'], 'R-01.2 a person outside the band reads none of its people');
select throws_ok(
  $$insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
    select '00000000-0000-0000-0000-000000005e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000aa02', id
    from public.instruments where slug = 'drums'$$,
  '42501', null, 'R-05.3 only the band''s MD or the set''s temporary MD edits its lineup'
);
select throws_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, text, anchored_revision_id, created_by)
    values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Verse', 'Mine.', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1')$$,
  '42501', null, 'R-06.4 an MD cannot write another band''s layer'
);

-- Ana, MD of the Sunday Band and owner of V1 and V2.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select results_eq(
  'select text from public.layer_notes order by text',
  array['Bass: roots only.', 'Everyone: open it up.', 'Keys: pad up an octave.'],
  'R-06.3 the MD reads every note of the band''s layer'
);
select is(
  (select count(*)::int from public.versions where id in ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4')),
  0, 'R-07.2 a hidden version is not read by others'
);
select isnt_empty(
  $$update public.versions set source_album = 'Live at home' where id = '00000000-0000-0000-0000-0000000000f1' returning id$$,
  'R-02.6 the owner edits their version'
);
select throws_ok(
  $$update public.versions set visibility = 'private' where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'R-02.4 a public version is made private only through its flow'
);
select throws_ok(
  $$delete from public.versions where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'R-02.4 a public version is never deleted'
);
select throws_ok(
  $$update public.revisions set content = 'changed' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  '42501', null, 'R-02.8 a revision is never edited'
);
select lives_ok(
  $$insert into public.revisions (version_id, number, content, author_id)
    values ('00000000-0000-0000-0000-0000000000f1', 3, e'## Chorus\n4 | 1', '00000000-0000-0000-0000-0000000000a1')$$,
  'R-02.8 the owner saves a new revision'
);
select lives_ok(
  $$insert into public.layer_notes (layer_id, version_id, section, text, anchored_revision_id, created_by)
    values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Verse', 'Softer.', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1')$$,
  'R-03.5 the MD writes notes on the layer'
);
select lives_ok(
  $$insert into public.sets (band_id, name, type) values ('00000000-0000-0000-0000-00000000b001', 'Christmas', 'concert')$$,
  'R-05.1 the MD creates a set'
);
select results_eq(
  $$with changed as (update public.set_items set pinned_revision_id = '00000000-0000-0000-0000-0000000000d5'
    where set_id = '00000000-0000-0000-0000-000000005e01' and version_id = '00000000-0000-0000-0000-0000000000f1' returning 1)
    select count(*)::int from changed$$,
  array[1], 'R-05.2 the MD updates a song to another revision'
);
select results_eq(
  $$with removed as (delete from public.band_members where id = '00000000-0000-0000-0000-00000000aa02' returning 1)
    select count(*)::int from removed$$,
  array[1], 'R-04.4 the MD removes a musician'
);

-- After leaving or being removed (R-04.4).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select is(
  (select count(*)::int from public.layer_notes) + (select count(*)::int from public.sets where band_id = '00000000-0000-0000-0000-00000000b001'),
  0, 'R-04.4 a removed musician loses access to the band''s sets and notes'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select results_eq(
  $$with removed as (delete from public.band_members where id = '00000000-0000-0000-0000-00000000aa03' returning 1)
    select count(*)::int from removed$$,
  array[1], 'R-04.4 a musician can leave the band'
);
select is((select count(*)::int from public.sets where band_id = '00000000-0000-0000-0000-00000000b001'), 0, 'R-04.4 whoever leaves the band loses access to its sets');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000d1'); end $$;
select results_eq(
  $$with removed as (delete from public.band_members where id = '00000000-0000-0000-0000-00000000aa01' returning 1)
    select count(*)::int from removed$$,
  array[0], 'R-04.1 nobody removes the MD'
);

-- Adam, an admin (R-07.1, R-07.2, R-07.3).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000f1'); end $$;
select is(
  (select count(*)::int from public.versions where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4')),
  4, 'R-07.2 an admin reads every version, hidden ones included'
);
select is((select count(*)::int from public.profiles), 6, 'R-07.1 an admin reads every profile');
select is(
  (select count(*)::int from public.layer_notes) + (select count(*)::int from public.sets)
    + (select count(*)::int from public.band_members where band_id in ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b002')),
  0, 'R-06.4 an admin sees no band''s members, sets or notes'
);
select lives_ok(
  $$insert into public.instruments (slug, name_en, name_es) values ('cajon', 'Cajon', 'Cajón')$$,
  'R-07.3 an admin extends the instrument catalog'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
