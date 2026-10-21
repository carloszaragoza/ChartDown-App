-- T-1601, T-1602, T-1607 tests (pgTAP): a set's live session, who starts, joins, moves, hands over
-- and ends it, its 5-minute timeout, its notices and its channel (R-12.1, R-12.2, R-12.10 to
-- R-12.12). Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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
create function pg_temp.setting(name text) returns uuid language sql as $$ select current_setting(name)::uuid $$;

-- Ana leads Harbor Band; Ben plays bass in Sunday's lineup; Carl is in the band but not in the
-- lineup; Dan is in no band.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'carl@example.test', '{"name": "Carl"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'dan@example.test', '{"name": "Dan"}');
do $$
declare
  invite uuid;
  guest record;
begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  perform set_config('test.v1', public.create_version(null, 'Alpha', null, 'Ana', e'## Verse\n1 | 4', 'live')::text, true);
  for guest in
    select * from (values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'ben@example.test'),
                          ('00000000-0000-0000-0000-0000000000c1'::uuid, 'carl@example.test')) g(person, email)
  loop
    perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
    invite := public.invite_to_band(pg_temp.setting('test.band'), guest.email);
    perform pg_temp.login(guest.person);
    perform public.respond_to_invitation(invite, true);
  end loop;
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;
insert into public.sets (id, band_id, name, date, type) values
  ('00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.band'), 'Sunday', current_date + 7, 'service');
do $$ begin
  perform public.add_to_set('00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.v1'));
  perform public.save_lineup('00000000-0000-0000-0000-00000000c501', jsonb_build_array(jsonb_build_object(
    'member_id', (select id from public.band_members where user_id = '00000000-0000-0000-0000-0000000000b1'),
    'instrument_ids', jsonb_build_array((select id from public.instruments where slug = 'bass')))));
end $$;

select has_table('public', 'live_sessions', 'live_sessions exists');

-- Starting: the MD only (R-12.1).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok($$select public.live_start('00000000-0000-0000-0000-00000000c501')$$,
  '42501', 'not_md', 'R-12.1 a musician cannot start a live session');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('test.session', public.live_start('00000000-0000-0000-0000-00000000c501')::text, true);
end $$;
select is(
  (select leader_id from public.live_sessions where id = pg_temp.setting('test.session')),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'R-12.1 the MD starts a live session and leads it'
);
select is(public.live_start('00000000-0000-0000-0000-00000000c501'), pg_temp.setting('test.session'),
  'R-12.1 starting again picks up the session the MD already leads');

-- Joining: whoever is in the lineup, or leads the band (R-12.2, R-12.12).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select is((select count(*)::int from public.live_sessions), 1, 'R-12.2 a lineup member sees the session');
select ok(private.can_listen_live('live:' || current_setting('test.session')),
  'R-12.12 a lineup member listens on the session''s channel');
select ok(not private.leads_live('live:' || current_setting('test.session')),
  'R-12.12 a follower does not broadcast on the channel');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select is((select count(*)::int from public.live_sessions), 0,
  'R-12.12 a band member outside the lineup does not see the session');
select ok(not private.can_listen_live('live:' || current_setting('test.session')),
  'R-12.12 a band member outside the lineup cannot listen');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000d1'); end $$;
select is((select count(*)::int from public.live_sessions), 0, 'R-12.12 someone outside the band does not see it');
select ok(not private.can_listen_live('live:' || current_setting('test.session')),
  'R-12.12 someone outside the band cannot join the channel');
select ok(not private.can_listen_live('live:not-a-session'), 'R-12.12 a topic naming no session is nobody''s');

-- Its notice (T-1607): the lineup hears it started; the leader does not.
do $$ begin perform pg_temp.logout(); end $$;
select is((select count(*)::int from public.notifications
           where user_id = '00000000-0000-0000-0000-0000000000b1' and type = 'live_started'
             and detail ->> 'leader' = 'Ana' and detail ->> 'set_name' = 'Sunday'), 1,
  'R-12.2 the lineup gets a Live now notice, with the set and who leads');
select is((select count(*)::int from public.notifications
           where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1')
             and type = 'live_started'), 0,
  'R-12.2 neither the leader nor a member outside the lineup gets it');

-- Moving: the leader only (R-12.3).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(format($$select public.live_move(%L, 1, 2)$$, current_setting('test.session')),
  '42501', 'not_leader', 'R-12.5 a follower never moves the leader''s position');
select throws_ok(format($$update public.live_sessions set section = 3 where id = %L$$, current_setting('test.session')),
  '42501', null, 'R-12.5 nobody changes the session but through its functions');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok(format($$select public.live_move(%L, 1, 2, 3)$$, current_setting('test.session')),
  'R-12.3 the leader moves to another section, with a cue');
select is((select array[song_position, section, cue] from public.live_sessions where id = pg_temp.setting('test.session')),
  array[1, 2, 3], 'R-12.4 the session keeps where the leader is and the cue');
select ok(private.leads_live('live:' || current_setting('test.session')), 'R-12.12 the leader broadcasts on the channel');

-- Handing over: to someone who may join (R-12.11).
select throws_ok(format($$select public.live_hand_over(%L, %L)$$, current_setting('test.session'),
  '00000000-0000-0000-0000-0000000000c1'), '23514', 'not_in_lineup',
  'R-12.11 control goes only to someone in the set');
select lives_ok(format($$select public.live_hand_over(%L, %L)$$, current_setting('test.session'),
  '00000000-0000-0000-0000-0000000000b1'), 'R-12.11 the leader hands control to a lineup member');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select lives_ok(format($$select public.live_move(%L, 1, 0)$$, current_setting('test.session')),
  'R-12.11 the new leader moves the band');

-- Ending: the leader or the MD; the lineup hears it ended (R-12.10).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok(format($$select public.live_end(%L)$$, current_setting('test.session')),
  'R-12.10 the MD ends the session');
do $$ begin perform pg_temp.logout(); end $$;
select is((select count(*)::int from public.notifications
           where user_id = '00000000-0000-0000-0000-0000000000b1' and type = 'live_ended'), 1,
  'R-12.10 the lineup gets a notice that live mode ended');

-- A leader not heard for 5 minutes: the session counts as ended, so another can start (R-12.10).
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('test.old', public.live_start('00000000-0000-0000-0000-00000000c501')::text, true);
end $$;
do $$ begin perform pg_temp.logout(); end $$;
update public.live_sessions set leader_seen_at = now() - interval '6 minutes' where id = pg_temp.setting('test.old');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select isnt(public.live_start('00000000-0000-0000-0000-00000000c501'), pg_temp.setting('test.old'),
  'R-12.10 a session ends 5 minutes after its leader drops; a new one starts');

select * from finish();
rollback;
