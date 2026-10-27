-- T-2848 tests (pgTAP): a song renamed from the Chart editor, by its only owner or an administrator.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'fay@example.test', '{"name": "Fay"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000f1';

do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('test.version',
    public.create_version(null, 'Lanten Bay', array['Harbor Lights'], 'Ana', e'## Verse\n1 | 4', 'live')::text, true);
end $$;

select ok(public.can_rename_song(current_setting('test.version')::uuid),
  'R-02.2 the owner of the song''s only version may rename it');
select public.rename_song(current_setting('test.version')::uuid, '  Lantern Bay ', array['Harbor Lights', ' ', 'Ana Ruiz ']);
select results_eq(
  $$select s.title, s.artists from public.songs s join public.versions v on v.song_id = s.id
    where v.id = current_setting('test.version')::uuid$$,
  $$values ('Lantern Bay'::text, array['Harbor Lights', 'Ana Ruiz']::text[])$$,
  'R-02.2 the title and artists are kept trimmed, empty artists left out'
);
select throws_ok(
  $$select public.rename_song(current_setting('test.version')::uuid, ' ', null)$$,
  '23514', null, 'R-02.2 a song keeps a title'
);

-- Ben is not the owner.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select ok(not public.can_rename_song(current_setting('test.version')::uuid),
  'R-02.2 someone else may not rename it');
select throws_ok(
  $$select public.rename_song(current_setting('test.version')::uuid, 'Stolen', null)$$,
  '42501', null, 'R-02.2 someone else''s rename is refused'
);

-- Ben makes his own version of the song: now its owner shares it and may not rename it.
do $$ begin
  perform public.create_version(
    (select song_id from public.versions where id = current_setting('test.version')::uuid),
    null, null, 'Ben', e'## Verse\n1', 'acoustic');
end $$;
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select ok(not public.can_rename_song(current_setting('test.version')::uuid),
  'R-02.2 once someone else has a version of the song, its owner may not rename it');
select throws_ok(
  $$select public.rename_song(current_setting('test.version')::uuid, 'Lantern Bay Live', null)$$,
  '42501', null, 'R-02.2 so nobody else''s chart changes name'
);

-- An administrator always may.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000f1'); end $$;
select ok(public.can_rename_song(current_setting('test.version')::uuid),
  'R-02.2 an administrator may rename any song');

do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok(
  $$select public.can_rename_song(current_setting('test.version')::uuid)$$,
  '42501', null, 'R-02.2 a visitor can''t ask'
);

select * from finish();
rollback;
