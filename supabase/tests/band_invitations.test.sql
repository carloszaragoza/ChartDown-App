-- T-701 tests (pgTAP): creating a band, inviting by email, answering, removing and leaving.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

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
create function pg_temp.band() returns uuid language sql as $$ select current_setting('test.band')::uuid $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'Ben@Example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test', '{"name": "Cleo"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'dan@example.test', '{"name": "Dan"}');
-- Ben plays keys and bass (his profile, R-01.2).
insert into public.user_instruments (user_id, instrument_id)
select '00000000-0000-0000-0000-0000000000b1', id from public.instruments where slug in ('keys', 'bass');

-- Ana creates a band (R-04.1).
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('  Harbor Band ')::text, true);
end $$;
select results_eq(
  $$select b.name, b.is_personal, m.user_id::text, m.role::text
    from public.bands b join public.band_members m on m.band_id = b.id where b.id = pg_temp.band()$$,
  $$values ('Harbor Band', false, '00000000-0000-0000-0000-0000000000a1', 'md')$$,
  'R-04.1 a user creates a band and is its only MD'
);
select throws_ok($$select public.create_band('  ')$$, '22023', 'name_invalid', 'R-04.1 a band needs a name');

-- Ana invites Ben by email, in any case; inviting again gives the same invitation (R-04.2).
do $$ begin perform set_config('test.invite', public.invite_to_band(pg_temp.band(), ' BEN@example.TEST ')::text, true); end $$;
select is(
  public.invite_to_band(pg_temp.band(), 'ben@example.test')::text, current_setting('test.invite'),
  'R-04.2 one pending invitation per band and email'
);
select throws_ok(
  $$select public.invite_to_band(pg_temp.band(), 'not-an-email')$$, '22023', 'email_invalid',
  'R-04.2 an invitation needs an email'
);
select throws_ok(
  $$select public.invite_to_band((select id from public.bands where personal_owner_id = '00000000-0000-0000-0000-0000000000a1'), 'ben@example.test')$$,
  '55000', 'personal_space', 'R-04.7 a personal space takes no invitations'
);

-- Only Ben sees his invitation; he does not see the band yet.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000d1'); end $$;
select is((select count(*)::int from public.band_invitations), 0, 'R-04.2 nobody else sees an invitation');
select throws_ok(
  $$select public.respond_to_invitation(current_setting('test.invite')::uuid, true)$$,
  '42501', 'not_found', 'R-04.2 only the invitee answers'
);
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select results_eq(
  $$select band_id, email from public.band_invitations$$,
  $$values (pg_temp.band(), 'ben@example.test')$$,
  'R-04.2 the invitee sees the invitation for the email they sign in with'
);
select is((select count(*)::int from public.bands where id = pg_temp.band()), 0, 'R-04.2 the band stays closed until they accept');
select results_eq(
  $$select band_name, invited_by_name from public.my_invitations()$$,
  $$values ('Harbor Band', 'Ana')$$,
  'R-04.2 the invitee sees which band invites them and who'
);

-- Ben accepts: a musician, with his profile's instruments (R-04.2, R-04.3).
select is(public.respond_to_invitation(current_setting('test.invite')::uuid, true), pg_temp.band(), 'R-04.2 the invitee accepts');
select results_eq(
  $$select m.role::text, array_agg(i.slug order by i.slug)
    from public.band_members m join public.member_instruments mi on mi.member_id = m.id
    join public.instruments i on i.id = mi.instrument_id
    where m.band_id = pg_temp.band() and m.user_id = '00000000-0000-0000-0000-0000000000b1'
    group by m.role$$,
  $$values ('musician', array['bass', 'keys'])$$,
  'R-04.3 a new musician starts with the instruments of their profile'
);
select throws_ok(
  $$select public.invite_to_band(pg_temp.band(), 'dan@example.test')$$, '42501', 'not_md',
  'R-04.2 only the MD invites'
);

-- Ben is the MD of his own band at the same time (R-04.5).
do $$ begin perform public.create_band('Ben''s Trio'); end $$;
select results_eq(
  $$select b.name, m.role::text from public.band_members m join public.bands b on b.id = m.band_id
    where m.user_id = '00000000-0000-0000-0000-0000000000b1' and not b.is_personal order by b.name$$,
  $$values ('Ben''s Trio', 'md'), ('Harbor Band', 'musician')$$,
  'R-04.5 a user belongs to several bands with a different role in each'
);

-- Ana sets Ben's default instruments (R-04.3), adds a set and a note; Ben reads them.
do $$ begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.version', public.create_version(null, 'Lantern Bay', null, 'Ana', e'## Verse\n1 | 4', 'live')::text, true);
  perform public.save_layer_note(pg_temp.band(), current_setting('test.version')::uuid, null, 'Verse', 1, null, 'Everyone soft.', null);
end $$;
delete from public.member_instruments where member_id = (
  select id from public.band_members where band_id = pg_temp.band() and user_id = '00000000-0000-0000-0000-0000000000b1'
) and instrument_id = (select id from public.instruments where slug = 'bass');
insert into public.sets (band_id, name, type) values (pg_temp.band(), 'Sunday', 'service');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select results_eq(
  $$select i.slug from public.member_instruments mi join public.band_members m on m.id = mi.member_id
    join public.instruments i on i.id = mi.instrument_id
    where m.band_id = pg_temp.band() and m.user_id = '00000000-0000-0000-0000-0000000000b1'$$,
  $$values ('keys')$$,
  'R-04.3 the MD changes a member''s default instruments'
);
select results_eq(
  $$select (select count(*)::int from public.sets where band_id = pg_temp.band()),
           (select count(*)::int from public.layer_notes where version_id = current_setting('test.version')::uuid)$$,
  $$values (1, 1)$$,
  'R-04.2 a member reads the band''s sets and notes'
);

-- Ben leaves and loses access at once (R-04.4).
delete from public.band_members where band_id = pg_temp.band() and user_id = '00000000-0000-0000-0000-0000000000b1';
select results_eq(
  $$select (select count(*)::int from public.bands where id = pg_temp.band()),
           (select count(*)::int from public.sets where band_id = pg_temp.band()),
           (select count(*)::int from public.layer_notes where version_id = current_setting('test.version')::uuid)$$,
  $$values (0, 0, 0)$$,
  'R-04.4 whoever leaves the band loses access to its sets'
);

-- The MD does not leave; the MD removes a musician (R-04.4).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
delete from public.band_members where band_id = pg_temp.band() and user_id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select role::text from public.band_members where band_id = pg_temp.band() and user_id = '00000000-0000-0000-0000-0000000000a1'),
  'md', 'R-04.4 the MD does not leave their band'
);
do $$ begin
  perform set_config('test.cleo', public.invite_to_band(pg_temp.band(), 'cleo@example.test')::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000c1');
  perform public.respond_to_invitation(current_setting('test.cleo')::uuid, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;
delete from public.band_members where band_id = pg_temp.band() and user_id = '00000000-0000-0000-0000-0000000000c1';
select is(
  (select count(*)::int from public.band_members where band_id = pg_temp.band()),
  1, 'R-04.4 the MD removes a musician'
);

-- Declining and cancelling.
do $$ begin
  perform set_config('test.cleo', public.invite_to_band(pg_temp.band(), 'cleo@example.test')::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000c1');
  perform public.respond_to_invitation(current_setting('test.cleo')::uuid, false);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;
select results_eq(
  $$select accepted, (select count(*)::int from public.band_members where band_id = pg_temp.band())
    from public.band_invitations where id = current_setting('test.cleo')::uuid$$,
  $$values (false, 1)$$,
  'R-04.2 the invitee declines and does not join'
);
do $$ begin perform set_config('test.dan', public.invite_to_band(pg_temp.band(), 'dan@example.test')::text, true); end $$;
delete from public.band_invitations where id = current_setting('test.dan')::uuid;
select is(
  (select count(*)::int from public.band_invitations where id = current_setting('test.dan')::uuid),
  0, 'R-04.2 the MD cancels a pending invitation'
);

-- An invitation goes with the invitee's account (Technical Plan 12.5).
do $$ begin
  perform set_config('test.dan', public.invite_to_band(pg_temp.band(), 'dan@example.test')::text, true);
  perform pg_temp.logout();
end $$;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d1';
select is(
  (select count(*)::int from public.band_invitations where email = 'dan@example.test'),
  0, 'R-01.6 deleting an account deletes the invitations to its email'
);
select is(
  (select count(*)::int from public.band_invitations where email ~ '[A-Z]'),
  0, 'R-04.2 invitation emails are kept in lowercase'
);

select * from finish();
rollback;
