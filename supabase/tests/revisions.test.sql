-- T-502 tests (pgTAP): saving and restoring revisions, which are never edited or deleted.
-- Run with: supabase test db
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

-- Ana publishes a version (revision 1) and saves four more (2 to 5).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('test.version',
    public.create_version(null, 'Lantern Bay', null, 'Ana', e'## Verse\nrevision 1', 'live')::text, true);
end $$;
select lives_ok(
  $$select public.save_revision(current_setting('test.version')::uuid, e'## Verse\nrevision ' || n) from generate_series(2, 5) n$$,
  'R-02.8 the owner saves new revisions'
);
select results_eq(
  $$select number, content from public.revisions where version_id = current_setting('test.version')::uuid order by number$$,
  $$values (1, e'## Verse\nrevision 1'), (2, e'## Verse\nrevision 2'), (3, e'## Verse\nrevision 3'),
           (4, e'## Verse\nrevision 4'), (5, e'## Verse\nrevision 5')$$,
  'R-02.8 every save creates a revision with the next number'
);
select is(
  (select r.number from public.versions v join public.revisions r on r.id = v.current_revision_id
   where v.id = current_setting('test.version')::uuid),
  5, 'R-02.8 the last save is the current revision'
);

-- Going back to revision 3.
do $$ begin
  perform set_config('test.restored', public.restore_revision(
    (select id from public.revisions where version_id = current_setting('test.version')::uuid and number = 3)
  )::text, true);
end $$;
select results_eq(
  $$select r.number, r.content, earlier.number, (v.current_revision_id = r.id)
    from public.revisions r
    join public.revisions earlier on earlier.id = r.restored_from_id
    join public.versions v on v.id = r.version_id
    where r.id = current_setting('test.restored')::uuid$$,
  $$values (6, e'## Verse\nrevision 3', 3, true)$$,
  'R-02.8 restoring revision 3 creates revision 6 with its content, and it is current'
);
select is(
  (select count(*)::int from public.revisions where version_id = current_setting('test.version')::uuid),
  6, 'R-02.8 restoring loses nothing from the history'
);
select throws_ok(
  $$select public.restore_revision(current_setting('test.restored')::uuid)$$,
  '55000', 'already_current', 'R-02.8 the current revision is not restored onto itself'
);
do $$ begin
  perform set_config('test.seventh', public.save_revision(current_setting('test.version')::uuid, e'## Verse\nrevision 7')::text, true);
end $$;
select is(
  (select number from public.revisions where id = current_setting('test.seventh')::uuid),
  7, 'R-02.8 numbering continues after a restore'
);

-- Revisions are immutable, even for their author.
select throws_ok(
  $$update public.revisions set content = 'changed' where version_id = current_setting('test.version')::uuid$$,
  '42501', null, 'R-02.8 a revision is never edited'
);
select throws_ok(
  $$delete from public.revisions where version_id = current_setting('test.version')::uuid$$,
  '42501', null, 'R-02.8 a revision is never deleted'
);

-- Only the owner saves or restores (R-02.6).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$select public.save_revision(current_setting('test.version')::uuid, 'Ben was here')$$,
  '42501', 'not_owner', 'R-02.8 someone else cannot save a revision'
);
select throws_ok(
  $$select public.restore_revision((select id from public.revisions where version_id = current_setting('test.version')::uuid and number = 1))$$,
  '42501', 'not_owner', 'R-02.8 someone else cannot restore a revision'
);
select is(
  (select count(*)::int from public.revisions where version_id = current_setting('test.version')::uuid),
  7, 'R-02.8 their attempts add nothing'
);
do $$ begin perform pg_temp.visitor(); end $$;
select throws_ok(
  $$select public.save_revision(current_setting('test.version')::uuid, 'visitor')$$,
  '42501', null, 'R-01.4 a visitor cannot save a revision'
);

-- A frozen version takes no new revisions.
do $$ begin perform pg_temp.logout(); end $$;
update public.versions set status = 'frozen' where id = current_setting('test.version')::uuid;
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$select public.save_revision(current_setting('test.version')::uuid, 'after freezing')$$,
  '55000', 'version_not_active', 'R-02.8 a frozen version takes no new revisions'
);
select throws_ok(
  $$select public.restore_revision((select id from public.revisions where version_id = current_setting('test.version')::uuid and number = 1))$$,
  '55000', 'version_not_active', 'R-02.8 a frozen version cannot be restored'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
