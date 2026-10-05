-- T-505 tests (pgTAP): the catalog lists songs with their public versions only.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

-- Only this test's songs: every title starts with "Cat-" so other rows never interfere.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}');
insert into public.songs (id, title, artists) values
  ('00000000-0000-0000-0000-000000000c01', 'Cat-Harbor Lights', '{Marisol Vega}'),
  ('00000000-0000-0000-0000-000000000c02', 'Cat-Quiet Mile', '{The Lanterns}'),
  ('00000000-0000-0000-0000-000000000c03', 'Cat-Secret Song', '{Nobody}'),
  ('00000000-0000-0000-0000-000000000c04', 'Cat-100%_Proof', '{}');
insert into public.versions (song_id, owner_id, author_name, visibility, status, source_type, source_album) values
  -- Harbor Lights: two public (live, studio), one frozen (live), one private, one hidden.
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'active', 'live', 'Night at the Pier'),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'active', 'studio', null),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'frozen', 'live', null),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'private', 'active', 'acoustic', 'Hidden Album'),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'hidden', 'acoustic', null),
  -- Quiet Mile: one public acoustic.
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'active', 'acoustic', 'Porch Demos'),
  -- Secret Song: only private.
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'private', 'active', 'live', null),
  ('00000000-0000-0000-0000-000000000c04', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'public', 'active', 'own_arrangement', null);

create function pg_temp.found(query text default 'Cat-', source public.source_type default null)
returns table (title text, versions integer) language sql as $$
  select title, versions from public.catalog(query, source) where title like 'Cat-%'
$$;

do $$ begin perform pg_temp.visitor(); end $$;
select results_eq(
  $$select * from pg_temp.found()$$,
  $$values ('Cat-100%_Proof', 1), ('Cat-Harbor Lights', 3), ('Cat-Quiet Mile', 1)$$,
  'R-02.9 each song shows how many public versions it has, in alphabetical order'
);
select is(
  (select count(*)::int from pg_temp.found() where title = 'Cat-Secret Song'),
  0, 'R-02.5 a song with only private versions does not appear'
);
select results_eq(
  $$select * from pg_temp.found('cat-harbor')$$,
  $$values ('Cat-Harbor Lights', 3)$$,
  'R-02.10 search by title, ignoring case, with frozen versions counted and hidden ones not'
);
select results_eq(
  $$select * from pg_temp.found('lanterns')$$,
  $$values ('Cat-Quiet Mile', 1)$$,
  'R-02.10 search by artist'
);
select results_eq(
  $$select * from pg_temp.found('porch')$$,
  $$values ('Cat-Quiet Mile', 1)$$,
  'R-02.10 search by album'
);
select is(
  (select count(*)::int from pg_temp.found('Hidden Album')),
  0, 'R-02.5 the album of a private version is not searched'
);
select results_eq(
  $$select * from pg_temp.found('Cat-', 'live')$$,
  $$values ('Cat-Harbor Lights', 2)$$,
  'R-02.10 the source filter narrows the versions counted'
);
select is(
  (select count(*)::int from pg_temp.found('Cat-', 'acoustic') where title = 'Cat-Harbor Lights'),
  0, 'R-02.5 private and hidden versions do not count for a source either'
);
select results_eq(
  $$select * from pg_temp.found('%_')$$,
  $$values ('Cat-100%_Proof', 1)$$,
  'R-02.10 the search text is taken literally'
);

-- Not even the owner sees their private versions in the catalog.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select results_eq(
  $$select * from pg_temp.found('Cat-Harbor')$$,
  $$values ('Cat-Harbor Lights', 3)$$,
  'R-02.5 a private version never appears in results, not even for its owner'
);
select is(
  (select count(*)::int from pg_temp.found('Secret')),
  0, 'R-02.5 the owner''s private-only song does not appear'
);

-- Pages of 30 (31 rows tell the page there is a next one).
do $$ begin perform pg_temp.logout(); end $$;
insert into public.songs (id, title)
select ('00000000-0000-0000-0000-0000000d' || lpad(n::text, 4, '0'))::uuid, 'Cat-Page ' || lpad(n::text, 2, '0')
from generate_series(1, 40) n;
insert into public.versions (song_id, owner_id, author_name, source_type)
select ('00000000-0000-0000-0000-0000000d' || lpad(n::text, 4, '0'))::uuid, '00000000-0000-0000-0000-0000000000a1', 'Ana', 'live'
from generate_series(1, 40) n;
do $$ begin perform pg_temp.visitor(); end $$;
select results_eq(
  $$select (select count(*)::int from public.catalog('Cat-Page', null, 1)),
           (select count(*)::int from public.catalog('Cat-Page', null, 2)),
           (select min(title) from public.catalog('Cat-Page', null, 2))$$,
  $$values (31, 10, 'Cat-Page 31')$$,
  'R-02.9 the catalog comes in pages of 30'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
