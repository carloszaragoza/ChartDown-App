-- T-1104 tests (pgTAP): only an admin reads the waitlist and invites from it; an invited entry
-- has its single-use code, noted with the email. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

-- Ada is an admin; Bo is not. Two people wait.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000005a1', 'ada@example.test'),
  ('00000000-0000-0000-0000-0000000005b1', 'bo@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000005a1', 'Ada'),
  ('00000000-0000-0000-0000-0000000005b1', 'Bo')
  on conflict (id) do update set name = excluded.name;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000005a1';
select public.join_waitlist('Wren@Example.test', 'es');
select public.join_waitlist('zoe@example.test');
create temp table entry as select id from public.waitlist where email = 'wren@example.test';
grant select on entry to authenticated;

select pg_temp.login('00000000-0000-0000-0000-0000000005b1');
select is((select count(*) from public.waitlist), 0::bigint,
  'R-07.5 a person who is not an admin reads nobody on the waitlist');
select throws_ok(format('select public.invite_from_waitlist(%L)', (select id from entry)),
  '42501', 'not_admin', 'R-07.5 a person who is not an admin cannot invite');

select pg_temp.login('00000000-0000-0000-0000-0000000005a1');
select is((select count(*) from public.waitlist where email in ('wren@example.test', 'zoe@example.test')),
  2::bigint, 'R-07.5 the Admin reads the waitlist');
create temp table made as select public.invite_from_waitlist((select id from entry)) as code;
select matches((select code from made), '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$',
  'R-07.5 Invite answers with a new code');
select results_eq(
  $$select c.kind::text, c.max_uses, c.note from public.invite_codes c join made m on m.code = c.code$$,
  $$values ('single_use', 1, 'wren@example.test')$$,
  'R-07.5 the code is single use, noted with the email');
select ok((select w.invited_at is not null and c.code = (select code from made)
  from public.waitlist w join public.invite_codes c on c.id = w.invited_code_id
  where w.id = (select id from entry)),
  'R-07.5 the entry is marked invited with its code');
select is(public.invite_from_waitlist((select id from entry)), (select code from made),
  'R-07.5 inviting again gives back the same code, not a second one');
select is((select count(*) from public.invite_codes where note = 'wren@example.test'), 1::bigint,
  'R-07.5 one code per person invited');
select is((select count(*) from public.waitlist where email = 'zoe@example.test' and invited_at is null),
  1::bigint, 'R-07.5 the others keep waiting');

select pg_temp.logout();
select is((select detail ->> 'email' from public.admin_log where action = 'waitlist_invited'
  and target_id = (select id::text from entry)), 'wren@example.test',
  'R-07.5 the invitation is in the admin log');

select * from finish();
rollback;
