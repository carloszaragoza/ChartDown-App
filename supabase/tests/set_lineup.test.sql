-- T-703 tests (pgTAP): a set's lineup and the key of each song. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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
create function pg_temp.instrument(slug text) returns uuid language sql as $$
  select id from public.instruments where instruments.slug = instrument.slug
$$;
create function pg_temp.member(person uuid) returns uuid language sql as $$
  select id from public.band_members where band_id = current_setting('test.band')::uuid and user_id = person
$$;
create function pg_temp.lineup() returns text language sql as $$
  select coalesce(string_agg(p.name || ':' || i.slug, ' ' order by p.name, i.slug), '')
  from public.set_lineup l join public.band_members m on m.id = l.member_id
  join public.profiles p on p.id = m.user_id join public.instruments i on i.id = l.instrument_id
  where l.set_id = current_setting('test.set')::uuid
$$;
create function pg_temp.events(kind text) returns int language sql as $$
  select count(*)::int from public.event_outbox
  where type::text = kind and detail ->> 'set_id' = current_setting('test.set')
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test', '{"name": "Cleo"}');

-- Ana's band with Ben and Cleo, a version in G and two sets that use it.
do $$
declare
  invite uuid;
  guest record;
begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  perform set_config('test.version', public.create_version(null, 'Lantern Bay', null, 'Ana', e'---\nkey: G\n---\n## Verse\n1 | 4', 'live')::text, true);
  for guest in
    select * from (values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'ben@example.test'),
                          ('00000000-0000-0000-0000-0000000000c1'::uuid, 'cleo@example.test')) g(person, email)
  loop
    perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
    invite := public.invite_to_band(current_setting('test.band')::uuid, guest.email);
    perform pg_temp.login(guest.person);
    perform public.respond_to_invitation(invite, true);
  end loop;
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;
insert into public.sets (id, band_id, name, type) values
  ('00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, 'Sunday', 'service'),
  ('00000000-0000-0000-0000-00000000c502', current_setting('test.band')::uuid, 'Friday', 'rehearsal');
do $$ begin
  perform set_config('test.set', '00000000-0000-0000-0000-00000000c501', true);
  perform set_config('test.item', public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.version')::uuid)::text, true);
  perform set_config('test.other', public.add_to_set('00000000-0000-0000-0000-00000000c502', current_setting('test.version')::uuid)::text, true);
end $$;

-- Lineup (R-05.3).
select is(pg_temp.lineup(), '', 'R-05.3 a set without its own lineup stores nothing and uses the band''s defaults');
select lives_ok(
  $$select public.save_lineup(current_setting('test.set')::uuid, jsonb_build_array(
      jsonb_build_object('member_id', pg_temp.member('00000000-0000-0000-0000-0000000000b1'), 'instrument_ids', jsonb_build_array(pg_temp.instrument('keys'))),
      jsonb_build_object('member_id', pg_temp.member('00000000-0000-0000-0000-0000000000c1'), 'instrument_ids', jsonb_build_array(pg_temp.instrument('bass')))))$$,
  'R-05.3 the MD saves the set''s lineup'
);
select is(pg_temp.lineup(), 'Ben:keys Cleo:bass', 'R-05.3 each musician plays the instruments chosen');
select lives_ok(
  $$select public.save_lineup(current_setting('test.set')::uuid, jsonb_build_array(
      jsonb_build_object('member_id', pg_temp.member('00000000-0000-0000-0000-0000000000b1'), 'instrument_ids',
        jsonb_build_array(pg_temp.instrument('keys'), pg_temp.instrument('vocals'))),
      jsonb_build_object('member_id', pg_temp.member('00000000-0000-0000-0000-0000000000c1'), 'instrument_ids', '[]'::jsonb)))$$,
  'R-05.3 one or several instruments, or none to sit out'
);
-- Events are read as the database, which records them.
do $$ begin perform pg_temp.logout(); end $$;
select results_eq(
  $$select pg_temp.lineup(), pg_temp.events('set_lineup_added'), pg_temp.events('set_lineup_removed')$$,
  $$values ('Ben:keys Ben:vocals', 3, 1)$$,
  'R-05.3 saving the lineup changes only what changed'
);

do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;

-- Keys (R-05.4).
update public.set_items set set_key = 'A' where id = current_setting('test.item')::uuid;
select results_eq(
  $$select (select set_key from public.set_items where id = current_setting('test.item')::uuid),
           (select set_key from public.set_items where id = current_setting('test.other')::uuid),
           (select r.content from public.versions v join public.revisions r on r.id = v.current_revision_id
            where v.id = current_setting('test.version')::uuid),
           (select count(*)::int from public.revisions where version_id = current_setting('test.version')::uuid)$$,
  $$values ('A', null::text, e'---\nkey: G\n---\n## Verse\n1 | 4', 1)$$,
  'R-05.4 the set key does not change the version for others'
);
do $$ begin perform pg_temp.logout(); end $$;
select is(pg_temp.events('set_key_changed'), 1, 'R-05.4 changing a song''s key is recorded');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$update public.set_items set set_key = 'H' where id = current_setting('test.item')::uuid$$,
  '23514', null, 'R-05.4 a key is a key name'
);

-- A musician changes neither.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$select public.save_lineup(current_setting('test.set')::uuid, '[]'::jsonb)$$,
  '42501', 'not_allowed', 'R-05.3 a musician cannot change the lineup'
);
update public.set_items set set_key = 'D' where id = current_setting('test.item')::uuid;
select is(
  (select set_key from public.set_items where id = current_setting('test.item')::uuid),
  'A', 'R-05.4 a musician cannot change a song''s key'
);
select is(pg_temp.lineup(), 'Ben:keys Ben:vocals', 'R-05.3 a member reads the lineup');

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
