-- T-403 tests (pgTAP): a person's profile and the instruments they play.
-- Run with: supabase test db
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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}');
insert into public.instruments (id, slug, name_en, name_es, active) values
  ('00000000-0000-0000-0000-0000000001c1', 'cajon', 'Cajon', 'Cajón', true);

select has_table('public', 'user_instruments', 'user_instruments exists');

do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok(
  $$insert into public.user_instruments (user_id, instrument_id)
    select '00000000-0000-0000-0000-0000000000a1', id from public.instruments where slug in ('keys', 'vocals', 'cajon')$$,
  'R-01.2 a person chooses the instruments they play, from the catalog'
);
select results_eq(
  $$select i.slug from public.user_instruments u join public.instruments i on i.id = u.instrument_id order by i.slug$$,
  array['cajon', 'keys', 'vocals'], 'R-01.2 a person reads their instruments'
);
select isnt_empty(
  $$update public.profiles set name = 'Ana Keys', language = 'es' where id = '00000000-0000-0000-0000-0000000000a1' returning id$$,
  'R-01.5 a person saves their name and language in their profile'
);
select throws_ok(
  $$insert into public.user_instruments (user_id, instrument_id)
    select '00000000-0000-0000-0000-0000000000b1', id from public.instruments where slug = 'bass'$$,
  '42501', null, 'R-01.2 nobody chooses instruments for someone else'
);
select is_empty(
  $$update public.profiles set name = 'Not Ben' where id = '00000000-0000-0000-0000-0000000000b1' returning id$$,
  'R-01.2 nobody edits someone else''s profile'
);

-- The Admin deactivates the cajón (R-07.3).
do $$ begin perform pg_temp.logout(); end $$;
update public.instruments set active = false where slug = 'cajon';
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$insert into public.user_instruments (user_id, instrument_id)
    select '00000000-0000-0000-0000-0000000000b1', id from public.instruments where slug = 'cajon'$$,
  '23514', null, 'R-07.3 a deactivated instrument cannot be chosen'
);
select is((select count(*)::int from public.user_instruments), 0, 'R-01.2 a person reads only their own instruments');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select is(
  (select count(*)::int from public.user_instruments u join public.instruments i on i.id = u.instrument_id where i.slug = 'cajon'),
  1, 'R-07.3 a deactivated instrument stays on the profiles that have it'
);
select results_eq(
  $$with removed as (delete from public.user_instruments where instrument_id = (select id from public.instruments where slug = 'vocals') returning 1)
    select count(*)::int from removed$$,
  array[1], 'R-01.2 a person stops playing an instrument'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
