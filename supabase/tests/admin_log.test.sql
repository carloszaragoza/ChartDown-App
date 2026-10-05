-- T-1101 tests (pgTAP): the instrument catalog is the Admin's, an instrument in use is never
-- deleted, and every Admin action is logged. Run with: supabase test db
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

-- Adam is an admin; Ben plays bass.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000002a1', 'adam@example.test'),
  ('00000000-0000-0000-0000-0000000002b1', 'ben@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000002a1', 'Adam'),
  ('00000000-0000-0000-0000-0000000002b1', 'Ben')
  on conflict (id) do update set name = excluded.name;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000002a1';
insert into public.user_instruments (user_id, instrument_id)
  select '00000000-0000-0000-0000-0000000002b1', id from public.instruments where slug = 'bass';

select pg_temp.login('00000000-0000-0000-0000-0000000002a1');
insert into public.instruments (slug, name_en, name_es, aliases) values ('cello', 'Cello', 'Violonchelo', '{vc}');
update public.instruments set name_es = 'Chelo' where slug = 'cello';
update public.instruments set active = false where slug = 'cello';
update public.instruments set active = true where slug = 'cello';
select results_eq(
  $$select action, detail ->> 'slug' from public.admin_log where target_table = 'instruments' order by id$$,
  $$values ('instrument_added', 'cello'), ('instrument_changed', 'cello'),
           ('instrument_deactivated', 'cello'), ('instrument_reactivated', 'cello')$$,
  'R-07.3 adding, renaming, deactivating and reactivating an instrument is logged'
);
select is(
  (select detail -> 'name_es' from public.admin_log where action = 'instrument_changed'),
  '{"from": "Violonchelo", "to": "Chelo"}'::jsonb,
  'R-07.3 the log keeps the old and the new name'
);
select is(
  (select count(*)::int from public.admin_log where admin_id = '00000000-0000-0000-0000-0000000002a1'), 4,
  'R-07.3 each line says which admin did it'
);
select throws_ok(
  $$delete from public.instruments where slug = 'bass'$$,
  '23503', null, 'R-07.3 an instrument in use cannot be deleted'
);
select lives_ok(
  $$update public.instruments set active = false where slug = 'bass'$$,
  'R-07.3 an instrument in use can be deactivated'
);
select ok(
  (select exists (select 1 from public.user_instruments ui join public.instruments i on i.id = ui.instrument_id
    where i.slug = 'bass' and ui.user_id = '00000000-0000-0000-0000-0000000002b1')),
  'R-07.3 a deactivated instrument stays where it is used'
);

insert into public.invite_codes (kind, max_uses, note) values ('band', 10, 'Cedar Band');
update public.invite_codes set revoked_at = now() where note = 'Cedar Band';
select results_eq(
  $$select action, (detail ->> 'code') = (select code from public.invite_codes where note = 'Cedar Band')
    from public.admin_log where target_table = 'invite_codes' order by id$$,
  $$values ('invite_created', true), ('invite_revoked', true)$$,
  'R-01.7 creating and revoking an invite code is logged with the code'
);

-- Nobody writes the log, not even an admin; only admins read it.
select throws_ok(
  $$insert into public.admin_log (action, target_table, target_id) values ('made_up', 'x', 'y')$$,
  '42501', null, 'nobody writes the Admin log through the API'
);
select throws_ok(
  $$delete from public.admin_log$$, '42501', null, 'nobody deletes the Admin log through the API'
);
select pg_temp.login('00000000-0000-0000-0000-0000000002b1');
select is((select count(*)::int from public.admin_log), 0, 'only admins read the Admin log');
select throws_ok(
  $$insert into public.instruments (slug, name_en, name_es) values ('oud', 'Oud', 'Laúd árabe')$$,
  '42501', null, 'R-07.3 only admins change the instrument catalog'
);

-- Changes the database makes itself are not Admin actions.
select pg_temp.logout();
update public.invite_codes set note = 'by the system';
select is(
  (select count(*)::int from public.admin_log where action = 'invite_changed'), 0,
  'a change made without an admin is not logged as one'
);

select * from finish();
rollback;
