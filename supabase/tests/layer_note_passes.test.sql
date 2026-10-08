-- T-1709 tests (pgTAP): a note of the MD layer can be for one pass of a repeat (R-03.6).
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.login(person uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', person, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.instrument(slug text) returns uuid language sql as $$
  select id from public.instruments where instruments.slug = instrument.slug
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.version', public.create_version(
    null, 'Northbound', null, 'Ana', e'## Verse\n|: 1 | 4 :| 2x', 'live'
  )::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform set_config('test.personal',
    (select id::text from public.bands where personal_owner_id = '00000000-0000-0000-0000-0000000000b1'), true);
  perform set_config('test.note', public.save_layer_note(
    current_setting('test.personal')::uuid, current_setting('test.version')::uuid, null,
    'Verse', 1, null, 'Ride cymbal.', array[pg_temp.instrument('drums')], array[2, 1, 2]
  )::text, true);
end $$;

select is(
  (select passes from public.layer_notes where id = current_setting('test.note')::uuid),
  array[1, 2],
  'R-03.6 a note keeps the passes it is for, each once and in order'
);
select is(
  (select array_agg(i.slug) from public.layer_note_instruments ni
   join public.instruments i on i.id = ni.instrument_id where ni.note_id = current_setting('test.note')::uuid),
  array['drums'],
  'R-06.4 the passes do not change who the note is for'
);

-- A call without passes, as before this change, is a note for every pass.
do $$ begin
  perform set_config('test.plain', public.save_layer_note(
    current_setting('test.personal')::uuid, current_setting('test.version')::uuid, null,
    'Verse', 1, null, 'Everyone soft.', null)::text, true);
end $$;
select is(
  (select passes from public.layer_notes where id = current_setting('test.plain')::uuid),
  array[]::integer[],
  'R-03.6 a note with no passes is for every pass'
);

-- Editing replaces the passes, and null clears them.
select lives_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      current_setting('test.note')::uuid, 'Verse', 1, null, 'Ride cymbal.', array[pg_temp.instrument('drums')], array[3])$$,
  'R-03.6 the MD edits the passes of a note'
);
select is(
  (select passes from public.layer_notes where id = current_setting('test.note')::uuid),
  array[3],
  'R-03.6 editing replaces the passes'
);
select lives_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      current_setting('test.note')::uuid, 'Verse', 1, null, 'Ride cymbal.', array[pg_temp.instrument('drums')], null)$$,
  'R-03.6 a note can go back to every pass'
);
select is(
  (select passes from public.layer_notes where id = current_setting('test.note')::uuid),
  array[]::integer[],
  'R-03.6 clearing the passes makes the note for every pass'
);

-- A pass is a number from 1 to 99, and a note names at most eight.
select throws_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      null, 'Verse', 1, null, 'Pass zero.', null, array[0])$$,
  '22023', 'passes_invalid', 'R-03.6 a pass below 1 is refused'
);
select throws_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      null, 'Verse', 1, null, 'Too many.', null, array[1, 2, 3, 4, 5, 6, 7, 8, 9])$$,
  '22023', 'passes_invalid', 'R-03.6 more than eight passes are refused'
);

select * from finish();
rollback;
