-- T-504 tests (pgTAP): making a version private leaves a frozen public version that nobody
-- edits and that other people's sets still open. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');

-- Ana publishes a version with two revisions.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.public', public.create_version(
    null, 'Lantern Bay', null, 'Ana Arranger', e'## Verse\nfirst', 'studio', 'Demos', 2026::smallint
  )::text, true);
  perform public.save_revision(current_setting('test.public')::uuid, e'## Verse\nsecond');
  perform pg_temp.logout();
end $$;

-- Ben's band has it in a set, pinned to revision 2.
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000000ba01', 'Harbor Band');
insert into public.band_members (band_id, user_id, role)
values ('00000000-0000-0000-0000-00000000ba01', '00000000-0000-0000-0000-0000000000b1', 'md');
insert into public.sets (id, band_id, name, type)
values ('00000000-0000-0000-0000-00000000c501', '00000000-0000-0000-0000-00000000ba01', 'Sunday', 'service');
insert into public.set_items (set_id, position, version_id, pinned_revision_id)
select '00000000-0000-0000-0000-00000000c501', 1, v.id, v.current_revision_id
from public.versions v where v.id = current_setting('test.public')::uuid;

-- Ben cannot make Ana's version private.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$select public.make_private(current_setting('test.public')::uuid)$$,
  '42501', 'not_owner', 'R-02.4 only the owner makes a version private'
);
do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok(
  $$select public.make_private(current_setting('test.public')::uuid)$$,
  '42501', null, 'R-01.4 a visitor cannot make a version private'
);

-- Ana makes it private.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.private', public.make_private(current_setting('test.public')::uuid)::text, true);
end $$;
select results_eq(
  $$select p.owner_id::text, p.visibility::text, p.status::text, p.author_name, p.song_id = o.song_id,
           p.source_type::text, p.source_album, p.source_year::int, p.forked_from_id is null
    from public.versions p, public.versions o
    where p.id = current_setting('test.private')::uuid and o.id = current_setting('test.public')::uuid$$,
  $$values ('00000000-0000-0000-0000-0000000000a1', 'private', 'active', 'Ana Arranger', true, 'studio', 'Demos', 2026, true)$$,
  'R-02.4 making private creates a private copy for the owner, with the same song and source'
);
select results_eq(
  $$select r.number, r.content, (v.current_revision_id = r.id)
    from public.revisions r join public.versions v on v.id = r.version_id
    where r.version_id = current_setting('test.private')::uuid$$,
  $$values (1, e'## Verse\nsecond', true)$$,
  'R-02.4 the private copy starts with the current chart'
);
select results_eq(
  $$select visibility::text, status::text, owner_id::text, author_name,
           (select count(*)::int from public.revisions where version_id = v.id)
    from public.versions v where id = current_setting('test.public')::uuid$$,
  $$values ('public', 'frozen', '00000000-0000-0000-0000-0000000000a1', 'Ana Arranger', 2)$$,
  'R-02.4 the public version is frozen, keeps the author''s name and its history'
);
select lives_ok(
  $$select public.save_revision(current_setting('test.private')::uuid, e'## Verse\nprivate edit')$$,
  'R-02.4 the owner keeps editing the private copy'
);

-- Frozen means frozen, even writing to the tables directly.
select throws_ok(
  $$select public.save_revision(current_setting('test.public')::uuid, 'after freezing')$$,
  '55000', 'version_not_active', 'R-02.4 a frozen version takes no new revisions'
);
select throws_ok(
  $$insert into public.revisions (version_id, number, content, author_id)
    values (current_setting('test.public')::uuid, 3, 'direct', '00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'R-02.4 a frozen version takes no revision written directly'
);
update public.versions set source_album = 'Changed' where id = current_setting('test.public')::uuid;
select is(
  (select source_album from public.versions where id = current_setting('test.public')::uuid),
  'Demos', 'R-02.4 a frozen version''s source cannot be changed directly'
);
select throws_ok(
  $$select public.make_private(current_setting('test.public')::uuid)$$,
  '55000', 'not_active_public', 'R-02.4 a frozen version is not made private again'
);
select throws_ok(
  $$select public.make_private(current_setting('test.private')::uuid)$$,
  '55000', 'not_active_public', 'R-02.4 a private version is not made private again'
);

-- Ben's set still opens the public version; he cannot read the private copy.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select results_eq(
  $$select r.content from public.set_items i join public.revisions r on r.id = i.pinned_revision_id
    where i.set_id = '00000000-0000-0000-0000-00000000c501'$$,
  $$values (e'## Verse\nsecond')$$,
  'R-02.4 other people''s sets still open the public version'
);
select lives_ok(
  $$select public.fork_version(current_setting('test.public')::uuid)$$,
  'R-02.4 the frozen public version can still be forked'
);
select is(
  (select count(*)::int from public.versions where id = current_setting('test.private')::uuid),
  0, 'R-02.5 someone else cannot read the private copy'
);
do $$ begin perform pg_temp.visitor(); end $$;
select results_eq(
  $$select (select count(*)::int from public.versions where id = current_setting('test.public')::uuid),
           (select count(*)::int from public.versions where id = current_setting('test.private')::uuid)$$,
  $$values (1, 0)$$,
  'R-02.4 a visitor reads the frozen version but not the private copy'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
