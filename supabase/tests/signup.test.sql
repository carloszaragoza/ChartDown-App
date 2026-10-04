-- T-401 tests (pgTAP): a new account gets its profile and personal space.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"full_name": "Ana López", "language": "es"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben.keys@example.test', '{}'),
  ('00000000-0000-0000-0000-0000000000c1', 'carl@example.test', jsonb_build_object('name', repeat('x', 100)));

select is(
  (select name || '/' || language::text || '/' || role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Ana López/es/user', 'R-01.1 signing up creates the profile with the provider''s name, as a user'
);
select is(
  (select language::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'es', 'R-01.5 the language chosen when signing up is kept'
);
select is(
  (select name || '/' || language::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
  'ben.keys/en', 'R-01.1 without a name, the profile uses the email and English'
);
select is(
  (select char_length(name) from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  80, 'R-01.2 a long name is cut to fit the profile'
);
select is(
  (select count(*)::int from public.bands where personal_owner_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1')),
  3, 'R-04.7 every new account gets its personal space'
);
select throws_ok(
  $$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'again@example.test')$$,
  '23505', null, 'R-01.1 an account has one profile'
);
select ok(
  not has_function_privilege('authenticated', 'private.create_profile_for_account()', 'execute'),
  'the sign-up function cannot be called through the API'
);

select * from finish();
rollback;
