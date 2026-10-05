-- T-405 tests (pgTAP): deleting an account leaves no personal data, and the community keeps
-- the public versions, credited to "ChartDown". Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
-- How many rows, in every table of the public schema, still mention something.
create function pg_temp.mentions(needle text) returns int language plpgsql as $$
declare
  t record;
  n int;
  total int := 0;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('select count(*) from public.%I x where to_jsonb(x)::text ilike %L', t.tablename, '%' || needle || '%') into n;
    total := total + n;
  end loop;
  return total;
end $$;

-- Zoe deletes her account. Ana and Ben stay.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000020e1', 'zoe.unique@example.test', '{"name": "Zoe Unique-7429"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');
insert into public.user_instruments (user_id, instrument_id)
  select '00000000-0000-0000-0000-0000000020e1', id from public.instruments where slug = 'keys';

-- Zoe's band (she is MD; Ana joined before Ben) and Ana's band (Zoe plays in it).
insert into public.bands (id, name) values
  ('00000000-0000-0000-0000-00000000b001', 'Zoe Band'),
  ('00000000-0000-0000-0000-00000000b002', 'Ana Band');
insert into public.band_members (id, band_id, user_id, role, joined_at) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000020e1', 'md', now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'musician', now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'musician', now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000aa04', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000a1', 'md', now()),
  ('00000000-0000-0000-0000-00000000aa05', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000020e1', 'musician', now());

-- Zoe's versions: one public, one private that Ana's band uses.
insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000000501', 'Open Road');
insert into public.versions (id, song_id, owner_id, author_name, visibility, source_type) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000020e1', 'Zoe Unique-7429', 'public', 'live'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000020e1', 'Zoe Unique-7429', 'private', 'studio');
insert into public.revisions (id, version_id, number, content, author_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 1, e'## Chorus\n4 | 1', '00000000-0000-0000-0000-0000000020e1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', 1, e'## Verse\n1 | 4', '00000000-0000-0000-0000-0000000020e1');

-- Sets: one in Zoe's personal space, one in Ana's band with Zoe in the lineup and as temporary MD.
insert into public.sets (id, band_id, name, date, type)
  select '00000000-0000-0000-0000-000000005e01', id, 'My practice', null, 'rehearsal' from public.bands
  where personal_owner_id = '00000000-0000-0000-0000-0000000020e1';
insert into public.sets (id, band_id, name, date, type) values
  ('00000000-0000-0000-0000-000000005e02', '00000000-0000-0000-0000-00000000b002', 'Sunday', current_date + 7, 'service');
insert into public.set_items (set_id, position, version_id, pinned_revision_id) values
  ('00000000-0000-0000-0000-000000005e01', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000005e02', 1, '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000005e02', 2, '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2');
insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select '00000000-0000-0000-0000-000000005e02', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000aa05', id
  from public.instruments where slug = 'keys';
insert into public.set_temp_md (set_id, band_id, member_id)
  values ('00000000-0000-0000-0000-000000005e02', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000aa05');

-- Layers: Zoe wrote a note in her band's layer; Ana's band has a layer on Zoe's private version.
insert into public.layers (id, band_id, version_id) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f2');
insert into public.layer_notes (id, layer_id, version_id, section, text, anchored_revision_id, created_by) values
  ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'Chorus', 'Open it up.', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000020e1');

-- Notices, preferences, the waitlist and an invite claim.
insert into public.notifications (user_id, type, detail) values ('00000000-0000-0000-0000-0000000020e1', 'added_to_set', '{}');
insert into public.notification_prefs (user_id, type, channel, active) values ('00000000-0000-0000-0000-0000000020e1', 'new_revision', 'in_app', false);
insert into public.waitlist (email) values ('zoe.unique@example.test');
insert into public.invite_codes (id, code) values ('00000000-0000-0000-0000-00000000c0d1', 'ZXEC-DDE2');
insert into public.invite_claims (code_id, email, user_id)
  values ('00000000-0000-0000-0000-00000000c0d1', 'zoe.unique@example.test', '00000000-0000-0000-0000-0000000020e1');

select ok(pg_temp.mentions('00000000-0000-0000-0000-0000000020e1') > 10, 'before: Zoe is all over the database');

-- Who may delete what.
do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok($$select public.delete_my_account('zoe.unique@example.test')$$, '42501', null, 'R-01.6 a visitor deletes no account');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$select public.delete_my_account('zoe.unique@example.test')$$,
  '22023', null, 'R-01.6 nobody deletes someone else''s account'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000020e1'); end $$;
select throws_ok($$select public.delete_my_account('someone@example.test')$$, '22023', null, 'R-01.6 deleting needs the account''s own email');

select lives_ok($$select public.delete_my_account(' ZOE.unique@example.test ')$$, 'R-01.6 a person deletes their account, confirming with their email');
do $$ begin perform pg_temp.logout(); end $$;

-- No personal data remains (the task's evidence).
select is(pg_temp.mentions('00000000-0000-0000-0000-0000000020e1'), 0, 'R-01.6 no row anywhere names the deleted account');
select is(pg_temp.mentions('zoe.unique@example.test'), 0, 'R-01.6 no row anywhere keeps their email');
select is(pg_temp.mentions('Zoe Unique-7429'), 0, 'R-01.6 no row anywhere keeps their name');
select is(
  (select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000020e1')
    + (select count(*)::int from auth.identities where user_id = '00000000-0000-0000-0000-0000000020e1'),
  0, 'R-01.6 the account and its sign-in methods are gone'
);

-- The community keeps the public version, credited to "ChartDown" (Technical Plan 12.5).
select is(
  (select author_name || '/' || coalesce(owner_id::text, 'no owner') from public.versions where id = '00000000-0000-0000-0000-0000000000f1'),
  'ChartDown/no owner', 'R-01.6 their public versions stay, credited to ChartDown'
);
select is(
  (select coalesce(author_id::text, 'no author') || '/' || content from public.revisions where id = '00000000-0000-0000-0000-0000000000d1'),
  e'no author/## Chorus\n4 | 1', 'R-01.6 the chart stays the same, without its author'
);
select is(
  (select coalesce(created_by::text, 'no author') from public.layer_notes where id = '00000000-0000-0000-0000-00000000ab01'),
  'no author', 'R-01.6 their notes stay in the band''s layer, without an author'
);
select is(
  (select count(*)::int from public.set_items where set_id = '00000000-0000-0000-0000-000000005e02'),
  1, 'R-01.6 Ana''s set keeps the public song and loses the deleted private one'
);

-- Their private version is gone, with the layer that used it.
select is(
  (select count(*)::int from public.versions where id = '00000000-0000-0000-0000-0000000000f2')
    + (select count(*)::int from public.layers where id = '00000000-0000-0000-0000-0000000002a1'),
  0, 'R-01.6 their private versions are deleted, with the layers on them'
);

-- Their band goes on: the longest-standing member becomes the MD, and the band is told.
select results_eq(
  $$select user_id::text || ':' || role from public.band_members where band_id = '00000000-0000-0000-0000-00000000b001' order by joined_at$$,
  array['00000000-0000-0000-0000-0000000000a1:md', '00000000-0000-0000-0000-0000000000b1:musician'],
  'R-04.1 the longest-standing member becomes the MD of a band whose MD left'
);
select is(
  (select detail ->> 'user_id' from public.event_outbox where type = 'band_md_changed'),
  '00000000-0000-0000-0000-0000000000a1', 'R-09.1 the band learns who its new MD is'
);
select is(
  (select count(*)::int from public.bands where id in ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b002')),
  2, 'R-01.6 the bands they played in stay'
);

select * from finish();
rollback;
