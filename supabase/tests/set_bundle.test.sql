-- T-902 tests (pgTAP): the bundle a person keeps to read a set with no internet.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
create function pg_temp.instrument(slug text) returns uuid language sql as $$
  select id from public.instruments where instruments.slug = instrument.slug
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'dan@example.test', '{"name": "Dan"}');

-- Ana's band with Ben on keys; two songs; notes for everyone, keys and bass.
do $$
declare
  invite uuid;
begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  perform set_config('test.v1', public.create_version(null, 'Alpha', null, 'Ana', e'---\nkey: G\n---\n## Verse\n1 | 4\n## Chorus\n4 | 5', 'live')::text, true);
  perform set_config('test.v2', public.create_version(null, 'Bravo', null, 'Ana', e'## Verse\n1', 'studio')::text, true);
  invite := public.invite_to_band(current_setting('test.band')::uuid, 'ben@example.test');
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform public.respond_to_invitation(invite, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.v1')::uuid, null, 'Verse', 1, null, 'Everyone soft.', null);
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.v1')::uuid, null, 'Chorus', 1, null, 'Keys pad.', array[pg_temp.instrument('keys')]);
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.v1')::uuid, null, 'Chorus', 1, null, 'Bass walks up.', array[pg_temp.instrument('bass')]);
end $$;
insert into public.member_instruments (member_id, instrument_id)
select id, pg_temp.instrument('keys') from public.band_members
where band_id = current_setting('test.band')::uuid and user_id = '00000000-0000-0000-0000-0000000000b1';
insert into public.sets (id, band_id, name, date, time, type)
values ('00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, 'Sunday', '2030-06-09', '09:00', 'service');
do $$ begin
  perform public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v1')::uuid);
  perform public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.v2')::uuid);
end $$;
update public.set_items set set_key = 'A' where set_id = '00000000-0000-0000-0000-00000000c501' and position = 1;

-- Ben downloads the set.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform set_config('test.bundle', public.set_bundle('00000000-0000-0000-0000-00000000c501')::text, true);
end $$;
select results_eq(
  $$select b -> 'set' ->> 'name', b -> 'set' ->> 'band', b -> 'set' ->> 'time', jsonb_array_length(b -> 'songs')
    from (select current_setting('test.bundle')::jsonb as b) x$$,
  $$values ('Sunday', 'Harbor Band', '09:00:00', 2)$$,
  'R-08.1 the bundle has the set and every song'
);
select results_eq(
  $$select s ->> 'title', s ->> 'set_key', s ->> 'content' like '%key: G%'
    from jsonb_array_elements(current_setting('test.bundle')::jsonb -> 'songs') s order by s ->> 'title'$$,
  $$values ('Alpha', 'A', true), ('Bravo', null, false)$$,
  'R-08.1 each song with its pinned chart and the set''s key'
);
select is(
  (select array_agg(n ->> 'text' order by n ->> 'text')
   from jsonb_array_elements(current_setting('test.bundle')::jsonb -> 'songs' -> 0 -> 'notes') n),
  array['Everyone soft.', 'Keys pad.'],
  'R-08.1 the bundle has the notes for the person''s instruments'
);
select is(
  position('Bass walks up' in current_setting('test.bundle')), 0,
  'R-06.4 a keys player''s bundle has no bass notes anywhere'
);
select results_eq(
  $$select l ->> 'name', l -> 'instruments'
    from jsonb_array_elements(current_setting('test.bundle')::jsonb -> 'lineup') l order by l ->> 'name'$$,
  $$values ('Ana', '[]'::jsonb), ('Ben', '["keys"]'::jsonb)$$,
  'R-08.1 the bundle has the lineup'
);
select ok(
  (current_setting('test.bundle')::jsonb -> 'anchored') ? (current_setting('test.bundle')::jsonb -> 'songs' -> 0 ->> 'revision_id'),
  'R-00.2 the bundle has the charts its notes were anchored to'
);
select is(
  public.set_bundle('00000000-0000-0000-0000-00000000c501') ->> 'stamp',
  current_setting('test.bundle')::jsonb ->> 'stamp',
  'R-08.3 the stamp stays the same while nothing changes'
);

-- A change to the set changes the stamp.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
update public.set_items set set_key = 'Bb' where set_id = '00000000-0000-0000-0000-00000000c501' and position = 1;
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select isnt(
  public.set_bundle('00000000-0000-0000-0000-00000000c501') ->> 'stamp',
  current_setting('test.bundle')::jsonb ->> 'stamp',
  'R-08.3 the stamp changes when the set changes'
);

-- Someone outside the band gets nothing.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000d1'); end $$;
select throws_ok(
  $$select public.set_bundle('00000000-0000-0000-0000-00000000c501')$$, '42501', 'not_found',
  'R-06.4 someone outside the band downloads nothing'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
