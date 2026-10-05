-- T-503 tests (pgTAP): forking a version. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');

-- Ana publishes a version with two revisions; a band has a layer on it.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.original', public.create_version(
    null, 'Lantern Bay', array['ChartDown examples'], 'Ana', e'## Verse\nfirst', 'acoustic', 'Demos', 2026::smallint, 'https://youtu.be/abc'
  )::text, true);
  perform public.save_revision(current_setting('test.original')::uuid, e'## Verse\nsecond');
  perform pg_temp.logout();
end $$;
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000000ba01', 'Harbor Band');
insert into public.layers (band_id, version_id)
values ('00000000-0000-0000-0000-00000000ba01', current_setting('test.original')::uuid);

-- Ben forks it.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform set_config('test.fork', public.fork_version(current_setting('test.original')::uuid)::text, true);
end $$;
select results_eq(
  $$select f.song_id = o.song_id, f.owner_id::text, f.author_name, f.visibility::text, f.status::text,
           f.source_type::text, f.source_album, f.source_year::int, f.source_youtube_url
    from public.versions f join public.versions o on o.id = f.forked_from_id
    where f.id = current_setting('test.fork')::uuid and o.id = current_setting('test.original')::uuid$$,
  $$values (true, '00000000-0000-0000-0000-0000000000b1', 'Ben', 'public', 'active', 'acoustic', 'Demos', 2026, 'https://youtu.be/abc')$$,
  'R-02.7 a fork points to the original, keeps its source, and is public and the forker''s'
);
select results_eq(
  $$select r.number, r.content, (v.current_revision_id = r.id)
    from public.revisions r join public.versions v on v.id = r.version_id
    where r.version_id = current_setting('test.fork')::uuid$$,
  $$values (1, e'## Verse\nsecond', true)$$,
  'R-02.7 a fork copies the current chart as its first revision'
);
do $$ begin perform pg_temp.logout(); end $$;
select is(
  (select count(*)::int from public.layers where version_id = current_setting('test.fork')::uuid),
  0, 'R-02.7 the MD layer does not travel with the fork'
);
select results_eq(
  $$select v.owner_id::text, r.number, (select count(*)::int from public.revisions where version_id = v.id)
    from public.versions v join public.revisions r on r.id = v.current_revision_id
    where v.id = current_setting('test.original')::uuid$$,
  $$values ('00000000-0000-0000-0000-0000000000a1', 2, 2)$$,
  'R-02.6 the original does not change'
);

-- Ben now owns his fork and saves to it; Ana's version is untouched.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select lives_ok(
  $$select public.save_revision(current_setting('test.fork')::uuid, e'## Verse\nBen''s take')$$,
  'R-02.6 the forker edits their own fork'
);

-- Ana does not fork her own version.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$select public.fork_version(current_setting('test.original')::uuid)$$,
  '55000', 'own_version', 'R-02.6 the owner does not fork their own version'
);

-- A frozen public version can be forked; a private one cannot, even by someone who can read it.
do $$ begin perform pg_temp.logout(); end $$;
update public.versions set status = 'frozen' where id = current_setting('test.original')::uuid;
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select lives_ok(
  $$select public.fork_version(current_setting('test.original')::uuid)$$,
  'R-02.7 a frozen public version can be forked'
);
do $$ begin perform pg_temp.logout(); end $$;
-- Ben's band uses a private version of Ana's in a layer, so Ben can read it.
insert into public.versions (id, song_id, owner_id, author_name, visibility, source_type)
select '00000000-0000-0000-0000-0000000000c1', song_id, '00000000-0000-0000-0000-0000000000a1', 'Ana', 'private', 'live'
from public.versions where id = current_setting('test.original')::uuid;
insert into public.revisions (id, version_id, number, content)
values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 1, e'## Verse\nprivate');
update public.versions set current_revision_id = '00000000-0000-0000-0000-0000000000c2'
where id = '00000000-0000-0000-0000-0000000000c1';
insert into public.band_members (band_id, user_id, role)
values ('00000000-0000-0000-0000-00000000ba01', '00000000-0000-0000-0000-0000000000b1', 'musician');
insert into public.layers (band_id, version_id)
values ('00000000-0000-0000-0000-00000000ba01', '00000000-0000-0000-0000-0000000000c1');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select is(
  (select count(*)::int from public.versions where id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'R-02.7 a band member can read the private version'
);
select throws_ok(
  $$select public.fork_version('00000000-0000-0000-0000-0000000000c1')$$,
  '55000', 'not_public', 'R-02.7 a private version is never forked'
);

do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok(
  $$select public.fork_version(current_setting('test.original')::uuid)$$,
  '42501', null, 'R-01.4 a visitor cannot fork'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
