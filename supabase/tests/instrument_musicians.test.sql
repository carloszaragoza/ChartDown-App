-- T-1305 tests (pgTAP): the Admin sees how many people chose each instrument, counts only, and
-- nobody else gets anything (R-07.3).
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000012a1', 'ada@example.test', '{"name": "Ada"}'),
  ('00000000-0000-0000-0000-0000000012b1', 'bo@example.test', '{"name": "Bo"}'),
  ('00000000-0000-0000-0000-0000000012c1', 'cy@example.test', '{"name": "Cy"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000012a1';
insert into public.instruments (id, slug, name_en, name_es) values
  ('00000000-0000-0000-0000-0000000012f1', 'test-harp', 'Test harp', 'Arpa de prueba'),
  ('00000000-0000-0000-0000-0000000012f2', 'test-lute', 'Test lute', 'Laúd de prueba');
insert into public.user_instruments (user_id, instrument_id) values
  ('00000000-0000-0000-0000-0000000012b1', '00000000-0000-0000-0000-0000000012f1'),
  ('00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012f1');

select pg_temp.login('00000000-0000-0000-0000-0000000012a1');
select is(
  (select musicians from public.instrument_musicians() where instrument_id = '00000000-0000-0000-0000-0000000012f1'),
  2, 'R-07.3 instrument_musicians counts the people who chose an instrument'
);
select is(
  (select musicians from public.instrument_musicians() where instrument_id = '00000000-0000-0000-0000-0000000012f2'),
  0, 'R-07.3 an instrument nobody chose counts zero'
);
select is(
  (select count(*)::integer from public.instrument_musicians()),
  (select count(*)::integer from public.instruments),
  'R-07.3 instrument_musicians returns one row per instrument, counts only'
);
-- The Admin still cannot read who chose what.
select is(
  (select count(*)::integer from public.user_instruments where instrument_id = '00000000-0000-0000-0000-0000000012f1'),
  0, 'R-07.3 the Admin still cannot read other people''s instruments'
);

select pg_temp.login('00000000-0000-0000-0000-0000000012b1');
select throws_ok(
  'select * from public.instrument_musicians()', '42501', null,
  'R-07.3 instrument_musicians answers admins only'
);

select pg_temp.logout();
set local role anon;
select throws_ok(
  'select * from public.instrument_musicians()', '42501', null,
  'R-07.3 a visitor cannot count musicians per instrument'
);

select * from finish();
rollback;
