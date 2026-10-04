-- T-301 schema tests (pgTAP). Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- Check the deferred current-revision link inside this transaction, not at a commit that never comes.
set constraints all immediate;

-- The tables of Technical Plan 4.
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'instruments', 'instruments exists');
select has_table('public', 'songs', 'songs exists');
select has_table('public', 'versions', 'versions exists');
select has_table('public', 'revisions', 'revisions exists');

-- Profiles (R-01.2, R-01.3, R-01.5).
select fk_ok('public', 'profiles', 'id', 'auth', 'users', 'id', 'a profile belongs to an account');
select enum_has_labels('public', 'platform_role', '{user,admin}'::name[], 'R-01.3 platform roles: user and admin');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Ana')
  on conflict (id) do update set name = excluded.name;
select is(
  (select language::text || '/' || role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'en/user', 'R-01.5 a new profile is in English, as a user'
);

-- Instruments (R-07.3, R-00.1).
select col_is_unique('public', 'instruments', 'slug', 'an instrument slug is unique');
select col_not_null('public', 'instruments', 'aliases', 'every instrument has its aliases');
select throws_ok(
  $$insert into public.instruments (slug, name_en, name_es) values ('Bad Slug', 'x', 'x')$$,
  '23514', null, 'a slug uses lowercase letters, digits and -'
);
select results_eq(
  'select slug from public.instruments order by slug',
  array['bass', 'drums', 'guitar', 'keys', 'saxophone', 'trombone', 'trumpet', 'violin', 'vocals'],
  'R-07.3 the starting list has the nine standard instruments'
);
select is(
  (select aliases from public.instruments where slug = 'guitar'),
  array['gtr', 'guitar', 'eg', 'ag'],
  'R-00.1 aliases follow ChartDown 0.4'
);
select is((select name_es from public.instruments where slug = 'drums'), 'Batería', 'R-01.5 instruments have a Spanish name');

-- Songs: no CCLI data (decision 10).
select hasnt_column('public', 'songs', 'ccli', 'songs have no CCLI field');

-- Versions (R-02.2, R-02.3, R-02.4, R-02.7).
select col_not_null('public', 'versions', 'source_type', 'R-02.2 the source type is required');
select enum_has_labels('public', 'version_status', '{active,frozen,hidden}'::name[], 'R-02.4 a version can be frozen');
select enum_has_labels('public', 'source_type', '{studio,live,acoustic,own_arrangement}'::name[], 'R-02.2 source types');
select fk_ok('public', 'versions', 'forked_from_id', 'public', 'versions', 'id', 'R-02.7 a fork keeps its original');
select col_not_null('public', 'versions', 'author_name', 'the author name at publish time is kept');

insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000000001', 'Open Road');
insert into public.versions (id, song_id, owner_id, author_name, source_type) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'own_arrangement'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', null, 'ChartDown', 'live');
select is(
  (select visibility::text || '/' || status::text from public.versions where id = '00000000-0000-0000-0000-000000000002'),
  'public/active', 'R-02.3 a new version is public and active'
);
select throws_ok(
  $$insert into public.versions (song_id, author_name) values ('00000000-0000-0000-0000-000000000001', 'A')$$,
  '23502', null, 'R-02.2 a version without a source is refused'
);
select throws_ok(
  $$insert into public.versions (song_id, author_name, source_type, source_youtube_url)
    values ('00000000-0000-0000-0000-000000000001', 'A', 'live', 'https://example.test/video')$$,
  '23514', null, 'R-02.2 the YouTube link must be a YouTube address'
);

-- Revisions (R-02.8).
select col_is_unique('public', 'revisions', '{version_id,number}'::name[], 'R-02.8 revision numbers are unique per version');
insert into public.revisions (id, version_id, number, content) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 1, e'## Verse\n1 | 4'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 1, e'## Verse\n5 | 1');
select lives_ok(
  $$update public.versions set current_revision_id = '00000000-0000-0000-0000-000000000003'
    where id = '00000000-0000-0000-0000-000000000002'$$,
  'a version points to its current revision'
);
select throws_ok(
  $$update public.versions set current_revision_id = '00000000-0000-0000-0000-000000000005'
    where id = '00000000-0000-0000-0000-000000000002'$$,
  '23503', null, 'a version cannot point to another version''s revision'
);
select throws_ok(
  $$insert into public.revisions (version_id, number, content)
    values ('00000000-0000-0000-0000-000000000002', 1, 'again')$$,
  '23505', null, 'R-02.8 a revision number is not reused'
);
select throws_ok(
  $$insert into public.revisions (version_id, number, content, restored_from_id)
    values ('00000000-0000-0000-0000-000000000002', 2, 'restored', '00000000-0000-0000-0000-000000000005')$$,
  '23503', null, 'R-02.8 a restore comes from a revision of the same version'
);

-- Row-level security on every table; what each role may see is tested in policies.test.sql (T-304).
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'every table has row-level security'
);

select * from finish();
rollback;
