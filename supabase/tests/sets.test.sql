-- T-702 tests (pgTAP): sets, their songs and order, and duplicating them.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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
create function pg_temp.order_of(set_id uuid) returns text language sql as $$
  select string_agg(s.title || '@' || i.position, ' ' order by i.position)
  from public.set_items i join public.versions v on v.id = i.version_id join public.songs s on s.id = v.song_id
  where i.set_id = order_of.set_id
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');

-- Ana's band, where Ben plays; three versions, the first saved twice.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  perform set_config('test.other', public.create_band('Second Band')::text, true);
  perform set_config('test.v1', public.create_version(null, 'Alpha', null, 'Ana', e'## Verse\n1', 'live')::text, true);
  perform public.save_revision(current_setting('test.v1')::uuid, e'## Verse\n1 | 4');
  perform set_config('test.v2', public.create_version(null, 'Bravo', null, 'Ana', e'## Verse\n4', 'live')::text, true);
  perform set_config('test.v3', public.create_version(null, 'Charlie', null, 'Ana', e'## Verse\n5', 'live')::text, true);
  perform set_config('test.invite', public.invite_to_band(current_setting('test.band')::uuid, 'ben@example.test')::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform public.respond_to_invitation(current_setting('test.invite')::uuid, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;

-- Names are unique within a band, ignoring case and spaces (R-05.1, decision 8).
insert into public.sets (id, band_id, name, type)
values ('00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, 'Sunday', 'service');
select throws_ok(
  $$insert into public.sets (band_id, name, type) values (current_setting('test.band')::uuid, '  sunday ', 'rehearsal')$$,
  '23505', null, 'R-05.1 a repeated name within the band is rejected'
);
select lives_ok(
  $$insert into public.sets (band_id, name, type) values (current_setting('test.other')::uuid, 'Sunday', 'concert')$$,
  'R-05.1 the same name in another band is fine'
);

-- Songs go at the end, pinned to the version's current revision (R-05.2).
do $$ begin
  perform set_config('test.i1', public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v1')::uuid)::text, true);
  perform set_config('test.i2', public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v2')::uuid)::text, true);
  perform set_config('test.i3', public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v3')::uuid)::text, true);
end $$;
select is(pg_temp.order_of('00000000-0000-0000-0000-00000000c501'), 'Alpha@1 Bravo@2 Charlie@3', 'R-05.2 songs are added in order');
select results_eq(
  $$select r.number from public.set_items i join public.revisions r on r.id = i.pinned_revision_id
    where i.id = current_setting('test.i1')::uuid$$,
  $$values (2)$$,
  'R-05.2 a song is pinned to the version''s current revision'
);
do $$ begin perform public.save_revision(current_setting('test.v1')::uuid, e'## Verse\n1 | 5'); end $$;
select results_eq(
  $$select r.number from public.set_items i join public.revisions r on r.id = i.pinned_revision_id
    where i.id = current_setting('test.i1')::uuid$$,
  $$values (2)$$,
  'R-05.2 a new revision from the author does not change the set'
);

-- Reordering and removing keep positions 1..n.
select lives_ok($$select public.move_in_set(current_setting('test.i3')::uuid, 1)$$, 'R-05.2 the MD moves a song');
select is(pg_temp.order_of('00000000-0000-0000-0000-00000000c501'), 'Charlie@1 Alpha@2 Bravo@3', 'R-05.2 reordering keeps the positions 1..n');
do $$ begin perform public.move_in_set(current_setting('test.i3')::uuid, 99); end $$;
select is(pg_temp.order_of('00000000-0000-0000-0000-00000000c501'), 'Alpha@1 Bravo@2 Charlie@3', 'R-05.2 a song moves to the end at most');
do $$ begin
  perform public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v2')::uuid);
  perform public.remove_from_set(current_setting('test.i1')::uuid);
end $$;
select is(pg_temp.order_of('00000000-0000-0000-0000-00000000c501'), 'Bravo@1 Charlie@2 Bravo@3', 'R-05.2 removing a song closes the gap; a version may appear twice');

-- Duplicating copies the songs and their pinned revisions and keys, not the date (R-05.6).
update public.set_items set set_key = 'A' where id = current_setting('test.i2')::uuid;
update public.sets set date = '2026-10-11' where id = '00000000-0000-0000-0000-00000000c501';
do $$ begin
  perform set_config('test.copy', public.duplicate_set('00000000-0000-0000-0000-00000000c501', 'Sunday (copy)')::text, true);
end $$;
select results_eq(
  $$select s.name, s.date, s.type::text, pg_temp.order_of(s.id) from public.sets s where s.id = current_setting('test.copy')::uuid$$,
  $$values ('Sunday (copy)', null::date, 'service', 'Bravo@1 Charlie@2 Bravo@3')$$,
  'R-05.6 duplicating copies the songs in order, without the date'
);
select results_eq(
  $$select array_agg(i.pinned_revision_id::text || coalesce(i.set_key, '-') order by i.position)
    from public.set_items i where i.set_id = current_setting('test.copy')::uuid$$,
  $$select array_agg(i.pinned_revision_id::text || coalesce(i.set_key, '-') order by i.position)
    from public.set_items i where i.set_id = '00000000-0000-0000-0000-00000000c501'$$,
  'R-05.6 duplicating keeps each song''s pinned revision and key'
);
select throws_ok(
  $$select public.duplicate_set('00000000-0000-0000-0000-00000000c501', 'SUNDAY')$$,
  '23505', 'name_taken', 'R-05.1 a duplicate needs a name not used in the band'
);

-- A musician reads the set but changes nothing.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select is(pg_temp.order_of('00000000-0000-0000-0000-00000000c501'), 'Bravo@1 Charlie@2 Bravo@3', 'R-05.2 a member reads the set');
select throws_ok(
  $$select public.move_in_set(current_setting('test.i3')::uuid, 1)$$, '42501', 'not_allowed',
  'R-05.2 a musician cannot reorder a set'
);
select throws_ok(
  $$select public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v1')::uuid)$$,
  '42501', 'not_md', 'R-05.2 a musician cannot add songs'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
