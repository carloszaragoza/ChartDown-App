-- T-2601 tests (pgTAP): the band's audio, private to the band in the table and in storage (R-06.7).
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
create function pg_temp.admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Ana is MD of the Sunday Band and Ben plays in it; Cleo is MD of another band.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b1', 'Ben'),
  ('00000000-0000-0000-0000-0000000000c1', 'Cleo')
  on conflict (id) do update set name = excluded.name;
insert into public.bands (id, name) values
  ('00000000-0000-0000-0000-00000000b001', 'Sunday Band'),
  ('00000000-0000-0000-0000-00000000b002', 'Friday Trio');
insert into public.band_members (band_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'md'),
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'musician'),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000c1', 'md');
insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000000001', 'Open Road');
insert into public.versions (id, song_id, author_name, source_type) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', 'Ana', 'own_arrangement');

select has_table('public', 'band_audio', 'band_audio exists');

-- The audio row.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok(
  $$insert into public.band_audio (band_id, version_id, path, size_bytes, duration_ms, content_type, peaks, added_by)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1',
            '00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1',
            4000000, 240000, 'audio/mpeg', '{0,500,1000}', '00000000-0000-0000-0000-0000000000a1')$$,
  'R-06.7 the MD adds the band''s recording of a version'
);
select throws_ok(
  $$insert into public.band_audio (band_id, version_id, path, size_bytes, duration_ms, content_type, added_by)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1',
            '00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1',
            4000000, 240000, 'audio/mpeg', '00000000-0000-0000-0000-0000000000a1')$$,
  '23505', null, 'R-06.7 one recording per band and version'
);
select lives_ok(
  $$update public.band_audio set music_start_ms = 7000 where band_id = '00000000-0000-0000-0000-00000000b001'$$,
  'R-06.7 the MD saves where the music starts'
);
select throws_ok(
  $$update public.band_audio set size_bytes = 1 where band_id = '00000000-0000-0000-0000-00000000b001'$$,
  '42501', null, 'R-06.7 nothing else of a recording is changed: it is replaced whole'
);

-- The table's limits: 15 MB, MP3 or M4A, its own path.
do $$ begin perform pg_temp.admin(); end $$;
select throws_ok(
  $$insert into public.band_audio (band_id, version_id, path, size_bytes, duration_ms, content_type)
    values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f1',
            '00000000-0000-0000-0000-00000000b002/00000000-0000-0000-0000-0000000000f1',
            15728641, 240000, 'audio/mpeg')$$,
  '23514', null, 'R-06.7 a file over 15 MB is refused'
);
select throws_ok(
  $$insert into public.band_audio (band_id, version_id, path, size_bytes, duration_ms, content_type)
    values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f1',
            '00000000-0000-0000-0000-00000000b002/00000000-0000-0000-0000-0000000000f1',
            4000000, 240000, 'audio/wav')$$,
  '23514', null, 'R-06.7 only MP3 or M4A'
);
select is(
  (select public or file_size_limit <> 15728640 from storage.buckets where id = 'band-audio'),
  false,
  'R-06.7 the bucket is private and holds files of 15 MB at most'
);

-- Ben, a musician of the band, hears it but can't add or remove one.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select is(
  (select count(*)::int from public.band_audio), 1, 'R-06.7 a member of the band reads the recording'
);
delete from public.band_audio;
update public.band_audio set music_start_ms = 1;
do $$ begin perform pg_temp.admin(); end $$;
select is(
  (select music_start_ms from public.band_audio where band_id = '00000000-0000-0000-0000-00000000b001'),
  7000, 'R-06.7 a musician neither removes it nor moves its start'
);

-- Cleo, MD of another band, and a visitor see nothing.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select is((select count(*)::int from public.band_audio), 0, 'R-06.7 another band reads nothing');
select throws_ok(
  $$insert into public.band_audio (band_id, version_id, path, size_bytes, duration_ms, content_type, added_by)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1',
            '00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1',
            4000000, 240000, 'audio/mpeg', '00000000-0000-0000-0000-0000000000c1')$$,
  '42501', null, 'R-06.7 nobody adds one for a band they don''t arrange'
);
do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok($$select count(*) from public.band_audio$$, '42501', null, 'R-06.7 a visitor reads nothing');

-- Storage: the same access to the files, by their names.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select ok(
  private.band_audio_object('00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1', false)
  and not private.band_audio_object('00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1', true),
  'R-06.7 in storage a musician hears the band''s file and can''t write it'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select ok(
  not private.band_audio_object('00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1', false),
  'R-06.7 in storage another band can''t hear it'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select ok(
  private.band_audio_object('00000000-0000-0000-0000-00000000b001/00000000-0000-0000-0000-0000000000f1', true)
  and not private.band_audio_object('../00000000-0000-0000-0000-0000000000f1', true),
  'R-06.7 in storage the MD writes the band''s file, and no other name'
);

select * from finish();
rollback;
