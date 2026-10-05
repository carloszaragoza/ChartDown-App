-- T-705 tests (pgTAP): a set's temporary MD changes that set's order, keys and lineup and
-- nothing else, until the set's date. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'carl@example.test', '{"name": "Carl"}');

-- Ana's band with Ben and Carl; Sunday next week and Friday; a keys note on the layer.
do $$
declare
  invite uuid;
  guest record;
begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  perform set_config('test.v1', public.create_version(null, 'Alpha', null, 'Ana', e'## Verse\n1 | 4', 'live')::text, true);
  perform set_config('test.v2', public.create_version(null, 'Bravo', null, 'Ana', e'## Verse\n4 | 5', 'live')::text, true);
  perform public.save_layer_note(pg_temp.setting('test.band'), pg_temp.setting('test.v1'), null, 'Verse', 1, null,
    'Keys pad.', array[(select id from public.instruments where slug = 'keys')]);
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
  ('00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.band'), 'Sunday', current_date + 7, 'service'),
  ('00000000-0000-0000-0000-00000000c502', pg_temp.setting('test.band'), 'Friday', current_date + 2, 'rehearsal');
do $$ begin
  perform set_config('test.a', public.add_to_set('00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.v1'))::text, true);
  perform set_config('test.b', public.add_to_set('00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.v2'))::text, true);
  perform set_config('test.f', public.add_to_set('00000000-0000-0000-0000-00000000c502', pg_temp.setting('test.v1'))::text, true);
end $$;

-- Ana appoints Ben for Sunday: until its date.
insert into public.set_temp_md (set_id, band_id, member_id)
select '00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.band'), id
from public.band_members where band_id = pg_temp.setting('test.band') and user_id = '00000000-0000-0000-0000-0000000000b1';
select is(
  (select until from public.set_temp_md where set_id = '00000000-0000-0000-0000-00000000c501'),
  current_date + 7, 'R-05.5 the temporary MD lasts until the set''s date by default'
);

-- Ben arranges Sunday.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select lives_ok($$select public.move_in_set(pg_temp.setting('test.b'), 1)$$, 'R-05.5 the temporary MD reorders their set');
update public.set_items set set_key = 'A' where id = pg_temp.setting('test.a');
select is((select set_key from public.set_items where id = pg_temp.setting('test.a')), 'A', 'R-05.5 the temporary MD changes a song''s key');
select lives_ok(
  $$select public.save_lineup('00000000-0000-0000-0000-00000000c501', jsonb_build_array(jsonb_build_object(
      'member_id', (select id from public.band_members where user_id = '00000000-0000-0000-0000-0000000000c1' and band_id = pg_temp.setting('test.band')),
      'instrument_ids', jsonb_build_array((select id from public.instruments where slug = 'bass')))))$$,
  'R-05.5 the temporary MD changes the lineup'
);
select is(
  (select count(*)::int from public.layer_notes where version_id = pg_temp.setting('test.v1')),
  1, 'R-06.3 the temporary MD reads every note of the versions in their set'
);

-- And nothing else.
select throws_ok(
  $$select public.move_in_set(pg_temp.setting('test.f'), 1)$$, '42501', 'not_allowed',
  'R-05.5 the temporary MD cannot edit other sets'
);
update public.set_items set set_key = 'D' where id = pg_temp.setting('test.f');
select is((select set_key from public.set_items where id = pg_temp.setting('test.f')), null, 'R-05.5 nor the keys of other sets');
select throws_ok(
  $$select public.save_layer_note(pg_temp.setting('test.band'), pg_temp.setting('test.v1'), null, 'Verse', 1, null, 'Ben''s idea.', null)$$,
  '42501', 'not_md', 'R-05.5 the temporary MD cannot edit the layer'
);
update public.sets set name = 'Ben''s Sunday', date = current_date + 30 where id = '00000000-0000-0000-0000-00000000c501';
delete from public.sets where id = '00000000-0000-0000-0000-00000000c501';
select results_eq(
  $$select name, date from public.sets where id = '00000000-0000-0000-0000-00000000c501'$$,
  $$values ('Sunday', current_date + 7)$$,
  'R-05.5 the temporary MD does not rename, date or delete the set'
);
select throws_ok(
  $$select public.add_to_set('00000000-0000-0000-0000-00000000c501', pg_temp.setting('test.v2'))$$, '42501', 'not_md',
  'R-05.5 the temporary MD does not add songs'
);
select throws_ok(
  $$select public.remove_from_set(pg_temp.setting('test.a'))$$, '42501', 'not_md',
  'R-05.5 the temporary MD does not remove songs'
);
select throws_ok(
  $$select public.update_pinned_revision(pg_temp.setting('test.a'))$$, '42501', 'not_md',
  'R-05.5 the temporary MD does not move a song to another revision'
);

-- Another musician cannot arrange the set.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select throws_ok(
  $$select public.move_in_set(pg_temp.setting('test.a'), 1)$$, '42501', 'not_allowed',
  'R-05.5 only the temporary MD of the set, not any musician'
);

-- The role lasts through the set's day and ends after it.
do $$ begin perform pg_temp.logout(); end $$;
update public.set_temp_md set until = current_date where set_id = '00000000-0000-0000-0000-00000000c501';
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select lives_ok($$select public.move_in_set(pg_temp.setting('test.a'), 1)$$, 'R-05.5 the role lasts until the end of the set''s day');
do $$ begin perform pg_temp.logout(); end $$;
update public.set_temp_md set until = current_date - 1 where set_id = '00000000-0000-0000-0000-00000000c501';
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$select public.move_in_set(pg_temp.setting('test.a'), 2)$$, '42501', 'not_allowed',
  'R-05.5 the role ends when the set''s date passes'
);

-- The MD removes the role.
do $$ begin perform pg_temp.logout(); end $$;
update public.set_temp_md set until = current_date + 7 where set_id = '00000000-0000-0000-0000-00000000c501';
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
delete from public.set_temp_md where set_id = '00000000-0000-0000-0000-00000000c501';
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$select public.move_in_set(pg_temp.setting('test.a'), 2)$$, '42501', 'not_allowed',
  'R-05.5 the role ends when the MD removes it'
);
select is(
  (select count(*)::int from public.layer_notes where version_id = pg_temp.setting('test.v1')),
  0, 'R-06.3 without the role, a musician reads only their own notes'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
