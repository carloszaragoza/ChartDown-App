-- T-708 tests (pgTAP): a set's optional time of day. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

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
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}');
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
end $$;

select lives_ok(
  $$insert into public.sets (id, band_id, name, date, time, type)
    values ('00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, 'Sunday', '2030-06-09', '09:00', 'service')$$,
  'R-05.1 the MD gives a set a date and a time'
);
select results_eq(
  $$select date, time from public.sets where id = '00000000-0000-0000-0000-00000000c501'$$,
  $$values ('2030-06-09'::date, '09:00'::time)$$,
  'R-05.1 the time is kept as written, the band''s local time'
);
select throws_ok(
  $$insert into public.sets (band_id, name, time, type) values (current_setting('test.band')::uuid, 'Someday', '10:00', 'rehearsal')$$,
  '23514', null, 'R-05.1 a time needs a date'
);
update public.sets set time = '18:30' where id = '00000000-0000-0000-0000-00000000c501';
select is(
  (select time from public.sets where id = '00000000-0000-0000-0000-00000000c501'), '18:30'::time,
  'R-05.1 the MD changes the time'
);
do $$ begin
  perform set_config('test.copy', public.duplicate_set('00000000-0000-0000-0000-00000000c501', 'Sunday (copy)')::text, true);
end $$;
select results_eq(
  $$select date, time from public.sets where id = current_setting('test.copy')::uuid$$,
  $$values (null::date, null::time)$$,
  'R-05.6 a duplicate has no date and no time'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
