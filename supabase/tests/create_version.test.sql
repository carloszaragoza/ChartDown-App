-- T-501 tests (pgTAP): creating a song and a version. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}');
insert into public.songs (id, title, artists) values ('00000000-0000-0000-0000-000000000501', 'Open Road', '{ChartDown examples}');

do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;

-- A new song and its version, in one go.
select lives_ok(
  $$select set_config('test.created', public.create_version(null, '  Lantern Bay ', array['ChartDown examples'], 'Ana', e'## Verse\n1m | b6', 'acoustic', 'Demos', 2026::smallint, null)::text, true)$$,
  'R-02.1 a person creates a song and a version of it'
);
select results_eq(
  format($$select s.title, v.visibility::text, v.status::text, v.owner_id::text, v.source_type::text, v.source_album, v.source_year::int
    from public.versions v join public.songs s on s.id = v.song_id where v.id = %L$$, current_setting('test.created')),
  $$values ('Lantern Bay', 'public', 'active', '00000000-0000-0000-0000-0000000000a1', 'acoustic', 'Demos', 2026)$$,
  'R-02.3 the new version is public, active and theirs, with its source'
);
select results_eq(
  format($$select r.number, r.content, r.author_id::text, (v.current_revision_id = r.id)
    from public.revisions r join public.versions v on v.id = r.version_id where v.id = %L$$, current_setting('test.created')),
  $$values (1, e'## Verse\n1m | b6', '00000000-0000-0000-0000-0000000000a1', true)$$,
  'R-02.1 the chart becomes the first revision of the version, and it is current'
);

-- A version of an existing song.
select lives_ok(
  $$select public.create_version('00000000-0000-0000-0000-000000000501', null, null, 'Ana', e'## Chorus\n4 | 1', 'live')$$,
  'R-02.1 a person creates a version of an existing song'
);
select is(
  (select count(*)::int from public.versions where song_id = '00000000-0000-0000-0000-000000000501'),
  1, 'R-02.1 the version belongs to the chosen song'
);
select is((select count(*)::int from public.songs where title = 'Open Road'), 1, 'R-02.1 using an existing song creates no new one');

-- The source is required (R-02.2), and a failure leaves nothing behind.
select throws_ok(
  $$select public.create_version(null, 'No Source Song', null, 'Ana', e'## Verse\n1', null)$$,
  '23502', 'source_required', 'R-02.2 a version without a source is refused, saying why'
);
select is((select count(*)::int from public.songs where title = 'No Source Song'), 0, 'R-02.2 a refused version leaves no song behind');
select throws_ok(
  $$select public.create_version(null, 'Bad Link', null, 'Ana', e'## Verse\n1', 'live', null, null, 'https://example.test/v')$$,
  '23514', null, 'R-02.2 the YouTube link must be a YouTube address'
);
select is((select count(*)::int from public.songs where title = 'Bad Link'), 0, 'R-02.2 a refused link leaves no song behind');

-- Visitors create nothing (R-01.4).
do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok(
  $$select public.create_version(null, 'Visitor Song', null, 'Me', e'## Verse\n1', 'live')$$,
  '42501', null, 'R-01.4 a visitor cannot create a version'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
