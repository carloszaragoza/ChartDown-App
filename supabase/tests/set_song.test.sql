-- T-801 tests (pgTAP): each person opening a set's song receives only the notes they may see.
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
create function pg_temp.instrument(slug text) returns uuid language sql as $$
  select id from public.instruments where instruments.slug = instrument.slug
$$;
create function pg_temp.member(person uuid) returns uuid language sql as $$
  select id from public.band_members where band_id = current_setting('test.band')::uuid and user_id = person
$$;
-- The texts of the notes someone receives for a set's first song.
create function pg_temp.notes(set_id uuid) returns text[] language sql as $$
  select coalesce(array_agg(n ->> 'text' order by n ->> 'text'), '{}')
  from jsonb_array_elements(public.set_song(set_id, 1) -> 'notes') n
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test', '{"name": "Cleo"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'dan@example.test', '{"name": "Dan"}');

-- Ana's band: Ben plays keys, Cleo bass. Four notes on the layer, one for each kind.
do $$
declare
  invite uuid;
  guest record;
begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  perform set_config('test.version', public.create_version(null, 'Lantern Bay', null, 'Ana',
    e'---\nkey: G\n---\n## Verse\n> MD: Author says soft.\n1 | 4\n## Chorus\n4 | 5', 'live')::text, true);
  for guest in
    select * from (values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'ben@example.test'),
                          ('00000000-0000-0000-0000-0000000000c1'::uuid, 'cleo@example.test')) g(person, email)
  loop
    perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
    invite := public.invite_to_band(current_setting('test.band')::uuid, guest.email);
    perform pg_temp.login(guest.person);
    perform public.respond_to_invitation(invite, true);
  end loop;
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.version')::uuid, null, 'Verse', 1, null, 'Everyone soft.', null);
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.version')::uuid, null, 'Chorus', 1, 2, 'Keys pad.', array[pg_temp.instrument('keys')], array[2]);
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.version')::uuid, null, 'Chorus', 1, null, 'Bass walks up.', array[pg_temp.instrument('bass')]);
  perform public.save_layer_note(current_setting('test.band')::uuid, current_setting('test.version')::uuid, null, 'Verse', 1, null, 'Vocals harmony.', array[pg_temp.instrument('vocals')]);
end $$;
insert into public.member_instruments (member_id, instrument_id) values
  (pg_temp.member('00000000-0000-0000-0000-0000000000b1'), pg_temp.instrument('keys')),
  (pg_temp.member('00000000-0000-0000-0000-0000000000c1'), pg_temp.instrument('bass'));
-- Sunday uses the band's defaults; Friday has its own lineup: Ben on keys and vocals, Cleo out.
insert into public.sets (id, band_id, name, type) values
  ('00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, 'Sunday', 'service'),
  ('00000000-0000-0000-0000-00000000c502', current_setting('test.band')::uuid, 'Friday', 'rehearsal');
do $$ begin
  perform public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.version')::uuid);
  perform public.add_to_set('00000000-0000-0000-0000-00000000c502', current_setting('test.version')::uuid);
  perform public.save_lineup('00000000-0000-0000-0000-00000000c502', jsonb_build_array(jsonb_build_object(
    'member_id', pg_temp.member('00000000-0000-0000-0000-0000000000b1'),
    'instrument_ids', jsonb_build_array(pg_temp.instrument('keys'), pg_temp.instrument('vocals')))));
end $$;
update public.set_items set set_key = 'A' where set_id = '00000000-0000-0000-0000-00000000c501';

-- Ben, on keys.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select is(
  pg_temp.notes('00000000-0000-0000-0000-00000000c501'), array['Everyone soft.', 'Keys pad.'],
  'R-06.2 a keys player receives the general and keys notes, never the bass notes'
);
select is(
  position('Bass walks up' in public.set_song('00000000-0000-0000-0000-00000000c501', 1)::text), 0,
  'R-06.4 the bass note is not anywhere in what the keys player receives'
);
select results_eq(
  $$select s ->> 'role', s -> 'instruments', s ->> 'set_key', (s ->> 'revision_number')::int, s ->> 'title',
           s ->> 'content' like '%Author says soft%'
    from public.set_song('00000000-0000-0000-0000-00000000c501', 1) s$$,
  $$values ('musician', '["keys"]'::jsonb, 'A', 1, 'Lantern Bay', true)$$,
  'R-06.1 the song comes with the key of the set, the pinned revision and the instruments of the musician'
);
select is(
  pg_temp.notes('00000000-0000-0000-0000-00000000c502'), array['Everyone soft.', 'Keys pad.', 'Vocals harmony.'],
  'R-06.2 a musician with two instruments in the lineup receives the notes for both'
);
select is(
  (public.set_song('00000000-0000-0000-0000-00000000c502', 1) -> 'instruments'), '["keys", "vocals"]'::jsonb,
  'R-06.1 the instruments come from the lineup of this set'
);
select results_eq(
  $$select n -> 'instruments', (n ->> 'bar')::int, n ->> 'section'
    from jsonb_array_elements(public.set_song('00000000-0000-0000-0000-00000000c501', 1) -> 'notes') n
    where n ->> 'text' = 'Keys pad.'$$,
  $$values ('["keys"]'::jsonb, 2, 'Chorus')$$,
  'R-06.2 each note comes with its anchor and instruments'
);

-- The pass a note is for travels with it (R-03.6): the keys note is for pass 2, the rest for every pass.
select results_eq(
  $$select n ->> 'text', n -> 'passes'
    from jsonb_array_elements(public.set_song('00000000-0000-0000-0000-00000000c501', 1) -> 'notes') n
    order by n ->> 'text'$$,
  $$values ('Everyone soft.', '[]'::jsonb), ('Keys pad.', '[2]'::jsonb)$$,
  'R-03.6 each note comes with the passes it is for, none meaning every pass'
);
select is(
  pg_temp.notes('00000000-0000-0000-0000-00000000c501'), array['Everyone soft.', 'Keys pad.'],
  'R-06.4 a note for one pass reaches the same players as a note for every pass'
);

-- Cleo, on bass in Sunday, out of Friday.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select is(
  pg_temp.notes('00000000-0000-0000-0000-00000000c501'), array['Bass walks up.', 'Everyone soft.'],
  'R-06.1 without a lineup of its own, the set uses the default instruments of the band'
);
select is(
  pg_temp.notes('00000000-0000-0000-0000-00000000c502'), array['Everyone soft.'],
  'R-06.2 a musician who does not play in this set receives the general notes only'
);
-- Even though row-level security lets Cleo read the bass note, set_song narrows it to this set.
select is(
  (select count(*)::int from public.layer_notes where text = 'Bass walks up.'), 1,
  'R-06.4 the policy is the wider barrier; the function narrows it to the set'
);

-- The MD, and a temporary MD, receive every note.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select is(
  pg_temp.notes('00000000-0000-0000-0000-00000000c502'),
  array['Bass walks up.', 'Everyone soft.', 'Keys pad.', 'Vocals harmony.'],
  'R-06.3 the MD receives every note'
);
insert into public.set_temp_md (set_id, band_id, member_id)
values ('00000000-0000-0000-0000-00000000c502', current_setting('test.band')::uuid, pg_temp.member('00000000-0000-0000-0000-0000000000c1'));
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select results_eq(
  $$select public.set_song('00000000-0000-0000-0000-00000000c502', 1) ->> 'role',
           cardinality(pg_temp.notes('00000000-0000-0000-0000-00000000c502'))$$,
  $$values ('temp_md', 4)$$,
  'R-06.3 the set''s temporary MD receives every note'
);

-- Someone outside the band receives nothing.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000d1'); end $$;
select throws_ok(
  $$select public.set_song('00000000-0000-0000-0000-00000000c501', 1)$$, '42501', 'not_found',
  'R-06.4 someone outside the band receives nothing'
);
select is(
  (select count(*)::int from public.layer_notes where version_id = current_setting('test.version')::uuid),
  0, 'R-06.4 and cannot read the band''s notes directly either'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
