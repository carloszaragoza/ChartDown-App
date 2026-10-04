-- T-302 tests (pgTAP): bands, members, default instruments and the personal space.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'bands', 'bands exists');
select has_table('public', 'band_members', 'band_members exists');
select has_table('public', 'member_instruments', 'member_instruments exists');
select enum_has_labels('public', 'band_role', '{md,musician}'::name[], 'R-04.5 a member is the MD or a musician of a band');

-- Two accounts. Creating a profile creates its personal space (R-04.7).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b1', 'Ben')
  on conflict (id) do update set name = excluded.name;

select is(
  (select count(*)::int from public.bands where personal_owner_id = '00000000-0000-0000-0000-0000000000a1' and is_personal),
  1, 'R-04.7 every account gets exactly one personal space'
);
select is(
  (select m.role::text from public.band_members m join public.bands b on b.id = m.band_id
    where b.personal_owner_id = '00000000-0000-0000-0000-0000000000a1'
      and m.user_id = '00000000-0000-0000-0000-0000000000a1'),
  'md', 'R-04.7 the owner is the MD of their personal space'
);
select is(
  (select count(*)::int from public.band_members m join public.bands b on b.id = m.band_id
    where b.personal_owner_id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'R-04.7 the personal space has its owner as its only member'
);
select throws_ok(
  $$insert into public.band_members (band_id, user_id)
    select id, '00000000-0000-0000-0000-0000000000b1' from public.bands
    where personal_owner_id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23514', null, 'R-04.7 a personal space accepts no other members'
);
select throws_ok(
  $$update public.band_members set role = 'musician'
    where user_id = '00000000-0000-0000-0000-0000000000a1'
      and band_id = (select id from public.bands where personal_owner_id = '00000000-0000-0000-0000-0000000000a1')$$,
  '23514', null, 'R-04.7 the owner stays the MD of their personal space'
);
select throws_ok(
  $$insert into public.bands (name, personal_owner_id) values ('Another', '00000000-0000-0000-0000-0000000000a1')$$,
  '23505', null, 'R-04.7 one personal space per person'
);

-- A real band: Ana creates it and is its only MD (R-04.1, decision 2).
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000000b001', 'Sunday Band');
select lives_ok(
  $$insert into public.band_members (band_id, user_id, role)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'md')$$,
  'R-04.1 the person who creates a band is its MD'
);
select throws_ok(
  $$insert into public.band_members (band_id, user_id, role)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'md')$$,
  '23505', null, 'R-04.1 a second permanent MD cannot be created'
);
insert into public.band_members (id, band_id, user_id)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$update public.band_members set role = 'md' where id = '00000000-0000-0000-0000-0000000000c1'$$,
  '23505', null, 'R-04.1 a musician cannot become a second MD either'
);
select throws_ok(
  $$insert into public.band_members (band_id, user_id)
    values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1')$$,
  '23505', null, 'a person joins a band once'
);
select throws_ok(
  $$update public.bands set personal_owner_id = '00000000-0000-0000-0000-0000000000b1'
    where id = '00000000-0000-0000-0000-00000000b001'$$,
  '23514', null, 'R-04.7 a band cannot become a personal space'
);

-- Ben is a musician in Ana's band and the MD of his own (R-04.5).
insert into public.bands (id, name) values ('00000000-0000-0000-0000-00000000b002', 'Friday Trio');
insert into public.band_members (band_id, user_id, role)
  values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000b1', 'md');
select results_eq(
  $$select b.name || ':' || m.role from public.band_members m join public.bands b on b.id = m.band_id
    where m.user_id = '00000000-0000-0000-0000-0000000000b1' and not b.is_personal order by b.name$$,
  array['Friday Trio:md', 'Sunday Band:musician'],
  'R-04.5 a person has a different role in each band'
);

-- Default instruments come from the catalog (R-04.3); an instrument in use stays (R-07.3).
select lives_ok(
  $$insert into public.member_instruments (member_id, instrument_id)
    select '00000000-0000-0000-0000-0000000000c1', id from public.instruments where slug in ('keys', 'vocals')$$,
  'R-04.3 a member has one or more default instruments from the catalog'
);
select throws_ok(
  $$delete from public.instruments where slug = 'keys'$$,
  '23503', null, 'R-07.3 an instrument in use is never deleted'
);

-- Deleting an account deletes its personal space and its memberships (R-04.7, R-01.6).
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from public.bands where personal_owner_id = '00000000-0000-0000-0000-0000000000a1'),
  0, 'R-04.7 the personal space is deleted with the account'
);
select is(
  (select count(*)::int from public.band_members where user_id = '00000000-0000-0000-0000-0000000000a1'),
  0, 'R-01.6 a deleted account leaves no memberships'
);

-- Closed to the API until T-304; the trigger functions are not callable.
set local role authenticated;
do $$ begin perform set_config('test.bands_seen',
  ((select count(*) from public.bands) + (select count(*) from public.band_members))::text, true); end $$;
reset role;
select is(current_setting('test.bands_seen'), '0', 'a signed-in user reads no bands or members yet');
select ok(
  not has_function_privilege('authenticated', 'public.create_personal_space()', 'execute')
    and not has_function_privilege('anon', 'public.personal_band_only_owner()', 'execute'),
  'the trigger functions cannot be called through the API'
);

select * from finish();
rollback;
