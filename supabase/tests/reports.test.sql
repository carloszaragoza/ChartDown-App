-- T-1103 tests (pgTAP): people report public versions; the Admin hides one, which leaves the
-- catalog and tells its owner, or dismisses the report. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
create function pg_temp.save() returns void language plpgsql as $$
begin
  set constraints all immediate;
  set constraints all deferred;
end $$;

-- Dana owns two versions; Ben and Carla read them; Adam is an admin.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000003a1', 'adam@example.test'),
  ('00000000-0000-0000-0000-0000000003b1', 'ben@example.test'),
  ('00000000-0000-0000-0000-0000000003c1', 'carla@example.test'),
  ('00000000-0000-0000-0000-0000000003d1', 'dana@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000003a1', 'Adam'),
  ('00000000-0000-0000-0000-0000000003b1', 'Ben'),
  ('00000000-0000-0000-0000-0000000003c1', 'Carla'),
  ('00000000-0000-0000-0000-0000000003d1', 'Dana')
  on conflict (id) do update set name = excluded.name;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000003a1';
insert into public.songs (id, title) values ('00000000-0000-0000-0000-000000030501', 'Copper Sky Report Test');
insert into public.versions (id, song_id, owner_id, author_name, source_type, visibility) values
  ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-000000030501', '00000000-0000-0000-0000-0000000003d1', 'Dana', 'live', 'public'),
  ('00000000-0000-0000-0000-0000000300f2', '00000000-0000-0000-0000-000000030501', '00000000-0000-0000-0000-0000000003d1', 'Dana', 'live', 'private');
insert into public.revisions (id, version_id, number, content) values
  ('00000000-0000-0000-0000-0000000300d1', '00000000-0000-0000-0000-0000000300f1', 1, e'## Verse\n1 | 4'),
  ('00000000-0000-0000-0000-0000000300d2', '00000000-0000-0000-0000-0000000300f2', 1, e'## Verse\n1 | 4');
update public.versions set current_revision_id = '00000000-0000-0000-0000-0000000300d1' where id = '00000000-0000-0000-0000-0000000300f1';
update public.versions set current_revision_id = '00000000-0000-0000-0000-0000000300d2' where id = '00000000-0000-0000-0000-0000000300f2';
select pg_temp.save();

-- Reporting (R-07.2).
select pg_temp.login('00000000-0000-0000-0000-0000000003b1');
select lives_ok(
  $$insert into public.reports (version_id, reporter_id, reason, note)
    values ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-0000000003b1', 'lyrics', 'The whole second verse is written out.')$$,
  'R-07.2 a signed-in person reports a public version'
);
select throws_ok(
  $$insert into public.reports (version_id, reporter_id, reason)
    values ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-0000000003b1', 'other')$$,
  '23505', null, 'R-07.2 one open report per person and version'
);
select throws_ok(
  $$insert into public.reports (version_id, reporter_id, reason)
    values ('00000000-0000-0000-0000-0000000300f2', '00000000-0000-0000-0000-0000000003b1', 'other')$$,
  '42501', null, 'R-07.2 only public versions are reported'
);
select throws_ok(
  $$insert into public.reports (version_id, reporter_id, reason)
    values ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-0000000003c1', 'other')$$,
  '42501', null, 'R-07.2 a report is made as yourself'
);
select is((select count(*)::int from public.reports), 0, 'R-07.2 a reporter does not read reports, not even their own');
select pg_temp.login('00000000-0000-0000-0000-0000000003d1');
select throws_ok(
  $$insert into public.reports (version_id, reporter_id, reason)
    values ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-0000000003d1', 'other')$$,
  '42501', null, 'R-07.2 nobody reports their own version'
);
select pg_temp.login('00000000-0000-0000-0000-0000000003c1');
insert into public.reports (version_id, reporter_id, reason)
  values ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-0000000003c1', 'lyrics');
select throws_ok(
  $$select public.hide_version('00000000-0000-0000-0000-0000000300f1', 'lyrics')$$,
  '42501', null, 'R-07.2 only admins hide a version'
);

-- The Admin hides it.
select pg_temp.login('00000000-0000-0000-0000-0000000003a1');
select is((select count(*)::int from public.reports where status = 'open'), 2, 'R-07.2 the Admin reads the open reports');
select public.hide_version('00000000-0000-0000-0000-0000000300f1', 'lyrics');
select pg_temp.save();
select is(
  (select status::text from public.versions where id = '00000000-0000-0000-0000-0000000300f1'), 'hidden',
  'R-07.2 the Admin hides a reported version'
);
select is(
  (select count(*)::int from public.reports where status = 'hidden' and resolved_by = '00000000-0000-0000-0000-0000000003a1'), 2,
  'R-07.2 hiding a version closes its open reports'
);
select is(
  (select action from public.admin_log where target_id = '00000000-0000-0000-0000-0000000300f1'), 'version_hidden',
  'R-07.2 hiding a version is logged'
);

select pg_temp.login('00000000-0000-0000-0000-0000000003b1');
select is(
  (select count(*)::int from public.catalog('Copper Sky Report Test', null, 1)), 0,
  'R-07.2 a hidden version leaves the catalog'
);
select is(
  (select count(*)::int from public.versions where id = '00000000-0000-0000-0000-0000000300f1'), 0,
  'R-07.2 the community no longer reads a hidden version'
);
select pg_temp.login('00000000-0000-0000-0000-0000000003d1');
select results_eq(
  $$select type, detail ->> 'title', detail ->> 'reason' from public.notifications$$,
  $$values ('version_hidden', 'Copper Sky Report Test', 'lyrics')$$,
  'R-07.2 its owner gets a notice saying which version and why'
);
select is(
  (select status::text from public.versions where id = '00000000-0000-0000-0000-0000000300f1'), 'hidden',
  'R-07.2 its owner still reads it, hidden'
);

-- Shown again, and a report dismissed.
select pg_temp.login('00000000-0000-0000-0000-0000000003a1');
select public.show_version('00000000-0000-0000-0000-0000000300f1');
select is(
  (select status::text from public.versions where id = '00000000-0000-0000-0000-0000000300f1'), 'active',
  'R-07.2 the Admin shows a hidden version again, as it was'
);
select pg_temp.login('00000000-0000-0000-0000-0000000003b1');
insert into public.reports (version_id, reporter_id, reason)
  values ('00000000-0000-0000-0000-0000000300f1', '00000000-0000-0000-0000-0000000003b1', 'other');
select pg_temp.login('00000000-0000-0000-0000-0000000003a1');
select public.dismiss_report((select id from public.reports where status = 'open'));
select results_eq(
  $$select (select status::text from public.versions where id = '00000000-0000-0000-0000-0000000300f1'),
           (select count(*)::int from public.admin_log where action in ('version_shown', 'report_dismissed'))$$,
  $$values ('active', 2)$$,
  'R-07.2 dismissing leaves the version as it is; showing and dismissing are logged'
);

select * from finish();
rollback;
