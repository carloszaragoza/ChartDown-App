-- T-2503 tests (pgTAP): where the music starts in a version's video, saved by its owner only.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');

do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('test.version',
    public.create_version(null, 'Lantern Bay', null, 'Ana', e'---\ntempo: 72\n---\n## Verse\n1 | 4', 'live')::text, true);
end $$;

update public.versions set video_start_ms = 7000 where id = current_setting('test.version')::uuid;
select is(
  (select video_start_ms from public.versions where id = current_setting('test.version')::uuid),
  7000,
  'R-03.11 the owner saves where the music starts'
);
select throws_ok(
  $$update public.versions set video_start_ms = 3600001 where id = current_setting('test.version')::uuid$$,
  '23514',
  null,
  'R-03.11 it stays within an hour'
);
select throws_ok(
  $$update public.versions set video_start_ms = -1 where id = current_setting('test.version')::uuid$$,
  '23514',
  null,
  'R-03.11 it is never negative'
);

-- Ben is signed in but is not the owner: his update finds nothing.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
update public.versions set video_start_ms = 1000 where id = current_setting('test.version')::uuid;
do $$ begin perform pg_temp.visitor(); end $$;
select is(
  (select video_start_ms from public.versions where id = current_setting('test.version')::uuid),
  7000,
  'R-03.11 only the owner saves it, and everyone reads it'
);
select throws_ok(
  $$update public.versions set video_start_ms = 1000 where id = current_setting('test.version')::uuid$$,
  '42501',
  null,
  'R-03.11 a visitor may not save it'
);

-- A frozen version's start stays as it was (the policy only finds active versions).
do $$ begin perform set_config('role', 'postgres', true); end $$;
update public.versions set status = 'frozen' where id = current_setting('test.version')::uuid;
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
update public.versions set video_start_ms = 2000 where id = current_setting('test.version')::uuid;
do $$ begin perform set_config('role', 'postgres', true); end $$;
select is(
  (select video_start_ms from public.versions where id = current_setting('test.version')::uuid),
  7000,
  'R-03.11 a frozen version keeps its start'
);

select * from finish();
rollback;
