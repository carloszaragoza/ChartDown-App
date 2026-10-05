-- T-603 tests (pgTAP): the band's MD writes notes on a version's layer; the version never
-- changes. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

-- Ana publishes a version; Ben is an MD (his personal space and Harbor Band, where Cleo plays).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test', '{"name": "Cleo"}');
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.version', public.create_version(
    null, 'Lantern Bay', null, 'Ana', e'## Verse\n1 | 4\n## Chorus\n4 | 5\n## Chorus\n4 | 1', 'live'
  )::text, true);
  perform pg_temp.logout();
end $$;
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000000ba01', 'Harbor Band');
insert into public.band_members (band_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000ba01', '00000000-0000-0000-0000-0000000000b1', 'md'),
  ('00000000-0000-0000-0000-00000000ba01', '00000000-0000-0000-0000-0000000000c1', 'musician');
do $$ begin
  perform set_config('test.personal',
    (select id::text from public.bands where personal_owner_id = '00000000-0000-0000-0000-0000000000b1'), true);
end $$;

-- Ben writes a note for keys in the second Chorus of his personal space.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform set_config('test.note', public.save_layer_note(
    current_setting('test.personal')::uuid, current_setting('test.version')::uuid, null,
    'Chorus', 2, 2, '  Pad swell into the last bar. ', array[pg_temp.instrument('keys')]
  )::text, true);
end $$;
select results_eq(
  $$select n.section, n.occurrence, n.bar, n.text, n.created_by::text,
           n.anchored_revision_id = v.current_revision_id, l.band_id::text
    from public.layer_notes n join public.layers l on l.id = n.layer_id
    join public.versions v on v.id = n.version_id
    where n.id = current_setting('test.note')::uuid$$,
  $$values ('Chorus', 2, 2, 'Pad swell into the last bar.', '00000000-0000-0000-0000-0000000000b1', true,
            current_setting('test.personal'))$$,
  'R-03.5 the MD saves a note on the band''s layer, anchored to the current revision'
);
select results_eq(
  $$select array_agg(i.slug order by i.slug) from public.layer_note_instruments ni
    join public.instruments i on i.id = ni.instrument_id where ni.note_id = current_setting('test.note')::uuid$$,
  $$values (array['keys'])$$,
  'R-03.5 the note is for the instruments chosen'
);
select results_eq(
  $$select (select count(*)::int from public.revisions where version_id = current_setting('test.version')::uuid),
           (select content from public.revisions r join public.versions v on v.current_revision_id = r.id
            where v.id = current_setting('test.version')::uuid)$$,
  $$values (1, e'## Verse\n1 | 4\n## Chorus\n4 | 5\n## Chorus\n4 | 1')$$,
  'R-03.5 the version does not change'
);

-- A second note reuses the layer; editing replaces the instruments.
select lives_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      null, 'Verse', 1, null, 'Everyone soft.', null)$$,
  'R-03.5 a note for everyone'
);
select is(
  (select count(*)::int from public.layers
   where band_id = current_setting('test.personal')::uuid and version_id = current_setting('test.version')::uuid),
  1, 'R-06.6 one layer per band and version'
);
select lives_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      current_setting('test.note')::uuid, 'Chorus', 1, null, 'Bass walks up.', array[pg_temp.instrument('bass')])$$,
  'R-03.5 the MD edits a note'
);
select results_eq(
  $$select n.section, n.occurrence, n.bar, n.text,
           (select array_agg(i.slug) from public.layer_note_instruments ni join public.instruments i on i.id = ni.instrument_id
            where ni.note_id = n.id)
    from public.layer_notes n where n.id = current_setting('test.note')::uuid$$,
  $$values ('Chorus', 1, null::int, 'Bass walks up.', array['bass'])$$,
  'R-03.5 editing a note replaces its anchor, text and instruments'
);

-- Only one line of at most 280 characters, and a real anchor.
select throws_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      null, 'Verse', 1, null, repeat('x', 281), null)$$,
  '22023', 'text_invalid', 'R-03.5 a note is at most 280 characters'
);
select throws_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      null, 'Verse', 1, null, e'two\nlines', null)$$,
  '22023', 'text_invalid', 'R-03.5 a note is one line'
);

-- Nobody but the band's MD writes.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select throws_ok(
  $$select public.save_layer_note('00000000-0000-0000-0000-00000000ba01', current_setting('test.version')::uuid,
      null, 'Verse', 1, null, 'Cleo''s idea.', null)$$,
  '42501', 'not_md', 'R-03.5 a musician cannot write on the band''s layer'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$select public.save_layer_note(current_setting('test.personal')::uuid, current_setting('test.version')::uuid,
      null, 'Verse', 1, null, 'Ana''s idea.', null)$$,
  '42501', 'not_md', 'R-06.4 someone outside the band cannot write on its layer'
);
select is(
  (select count(*)::int from public.layer_notes where version_id = current_setting('test.version')::uuid),
  0, 'R-06.4 the author of the version cannot read another band''s notes'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
