-- T-1308 tests (pgTAP): the author of a public version sees how many bands and musicians use it,
-- totals only, and nobody else gets anything (R-02.11).
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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
create function pg_temp.personal(person uuid) returns uuid language sql as $$
  select b.id from public.bands b join public.band_members m on m.band_id = b.id
  where b.is_personal and m.user_id = person
$$;
-- A set of a band, dated some days ago (null: undated), with a version in it.
create function pg_temp.set_with(band uuid, name text, days_ago integer, version uuid) returns void
language plpgsql as $$
declare
  new_set uuid;
begin
  insert into public.sets (band_id, name, date, type)
  values (band, name, case when days_ago is null then null else current_date - days_ago end, 'service')
  returning id into new_set;
  insert into public.set_items (set_id, position, version_id, pinned_revision_id)
  select new_set, 1, v.id, v.current_revision_id from public.versions v where v.id = version;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000011a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000011b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000011c1', 'cleo@example.test', '{"name": "Cleo"}'),
  ('00000000-0000-0000-0000-0000000011d1', 'dan@example.test', '{"name": "Dan"}'),
  ('00000000-0000-0000-0000-0000000011e1', 'eve@example.test', '{"name": "Eve"}');

-- Ana publishes Lantern Bay, and a second version she then makes private.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000011a1');
  perform set_config('test.public', public.create_version(null, 'Lantern Bay', null, 'Ana',
    e'## Verse\n1 | 4', 'live')::text, true);
  perform set_config('test.private', public.create_version(null, 'Quiet Mile', null, 'Ana',
    e'## Verse\n1 | 5', 'studio')::text, true);
  -- Ben's band, with Cleo; Dan's band, with Eve.
  perform pg_temp.login('00000000-0000-0000-0000-0000000011b1');
  perform set_config('test.harbor', public.create_band('Harbor Band')::text, true);
  perform set_config('test.invite', public.invite_to_band(current_setting('test.harbor')::uuid, 'cleo@example.test')::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000011c1');
  perform public.respond_to_invitation(current_setting('test.invite')::uuid, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000011d1');
  perform set_config('test.cedar', public.create_band('Cedar Band')::text, true);
  perform set_config('test.invite', public.invite_to_band(current_setting('test.cedar')::uuid, 'eve@example.test')::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000011e1');
  perform public.respond_to_invitation(current_setting('test.invite')::uuid, true);
  perform pg_temp.logout();
end $$;
update public.versions set visibility = 'private' where id = current_setting('test.private')::uuid;

-- Harbor plays Lantern Bay today; Cedar played it 60 days ago; Dan has it, undated, in his
-- personal space; Harbor also has Ana's private version in a set.
do $$ begin
  perform pg_temp.set_with(current_setting('test.harbor')::uuid, 'Sunday', 0, current_setting('test.public')::uuid);
  perform pg_temp.set_with(current_setting('test.cedar')::uuid, 'Spring', 60, current_setting('test.public')::uuid);
  perform pg_temp.set_with(pg_temp.personal('00000000-0000-0000-0000-0000000011d1'), 'Practice', null, current_setting('test.public')::uuid);
  perform pg_temp.set_with(current_setting('test.harbor')::uuid, 'Friday', 0, current_setting('test.private')::uuid);
end $$;

-- Ana, the author.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000011a1'); end $$;
select results_eq(
  $$select version_id, bands, musicians from public.version_usage(null) where version_id is not null$$,
  format($$values (%L::uuid, 2, 4)$$, current_setting('test.public')),
  'R-02.11 all time: two bands (personal spaces aside) and four musicians use her public version'
);
select results_eq(
  $$select bands, musicians from public.version_usage(null) where version_id is null$$,
  $$values (2, 4)$$,
  'R-02.11 the totals row counts each band and each musician once'
);
select results_eq(
  $$select bands, musicians from public.version_usage(30) where version_id is not null$$,
  $$values (1, 2)$$,
  'R-02.11 the last 30 days count only sets dated in them'
);
select results_eq(
  $$select bands, musicians from public.version_usage(7) where version_id is not null$$,
  $$values (1, 2)$$,
  'R-02.11 the last 7 days too'
);
select is_empty(
  format($$select 1 from public.version_usage(null) where version_id = %L$$, current_setting('test.private')),
  'R-02.11 a private version is never counted'
);
select is(
  (select array_agg(a.name::text order by a.n)
     from pg_proc p, unnest(p.proargnames, p.proargmodes) with ordinality as a(name, mode, n)
     where p.proname = 'version_usage' and a.mode = 't'),
  array['version_id', 'bands', 'musicians'],
  'R-02.11 the function returns totals only: no band, set or person'
);
select is_empty(
  $$select 1 from public.version_usage(90)$$,
  'R-02.11 only the periods of the design (7 and 30 days, or all time)'
);

-- Ben, who uses the version but is not its author, gets nothing.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000011b1'); end $$;
select is_empty(
  $$select 1 from public.version_usage(null)$$,
  'R-02.11 nobody but the author gets a version''s numbers'
);
-- Nor can he read the other band's sets directly.
select is_empty(
  format($$select 1 from public.sets where band_id = %L$$, current_setting('test.cedar')),
  'R-02.11 the numbers open no other band''s sets'
);

-- A visitor cannot call it.
do $$ begin
  perform pg_temp.logout();
  perform set_config('role', 'anon', true);
end $$;
select throws_ok(
  $$select * from public.version_usage(null)$$,
  '42501',
  null,
  'R-02.11 a visitor cannot ask for usage numbers'
);

select * from finish();
rollback;
