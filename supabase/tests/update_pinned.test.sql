-- T-704 tests (pgTAP): a set's song stays on its revision until the MD updates it.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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
create function pg_temp.pinned(item text) returns int language sql as $$
  select r.number from public.set_items i join public.revisions r on r.id = i.pinned_revision_id
  where i.id = current_setting(item)::uuid
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.test', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ben@example.test', '{"name": "Ben"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cleo@example.test', '{"name": "Cleo"}');

-- Cleo publishes a version. Ana's band (with Ben) and Cleo's own band use it.
do $$
declare
  invite uuid;
begin
  perform pg_temp.login('00000000-0000-0000-0000-0000000000c1');
  perform set_config('test.version', public.create_version(null, 'Lantern Bay', null, 'Cleo', e'## Verse\n1', 'live')::text, true);
  perform set_config('test.cleo_band', public.create_band('Cleo Trio')::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
  perform set_config('test.band', public.create_band('Harbor Band')::text, true);
  invite := public.invite_to_band(current_setting('test.band')::uuid, 'ben@example.test');
  perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
  perform public.respond_to_invitation(invite, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;
insert into public.sets (id, band_id, name, type)
values ('00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, 'Sunday', 'service');
do $$ begin
  perform set_config('test.item', public.add_to_set('00000000-0000-0000-0000-00000000c501', current_setting('test.version')::uuid)::text, true);
  perform pg_temp.login('00000000-0000-0000-0000-0000000000c1');
end $$;
insert into public.sets (id, band_id, name, type)
values ('00000000-0000-0000-0000-00000000c502', current_setting('test.cleo_band')::uuid, 'Sunday', 'service');
do $$ begin
  perform set_config('test.cleo_item', public.add_to_set('00000000-0000-0000-0000-00000000c502', current_setting('test.version')::uuid)::text, true);
  -- The author publishes revision 2.
  perform public.save_revision(current_setting('test.version')::uuid, e'## Verse\n1 | 4');
  perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
end $$;

select is(pg_temp.pinned('test.item'), 1, 'R-05.2 a new revision from the author does not change the set until accepted');

-- A musician, or a temporary MD, does not update.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$select public.update_pinned_revision(current_setting('test.item')::uuid)$$, '42501', 'not_md',
  'R-05.2 a musician does not update a song'
);
do $$ begin perform pg_temp.logout(); end $$;
insert into public.set_temp_md (set_id, band_id, member_id)
select '00000000-0000-0000-0000-00000000c501', current_setting('test.band')::uuid, id
from public.band_members where band_id = current_setting('test.band')::uuid and user_id = '00000000-0000-0000-0000-0000000000b1';
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000b1'); end $$;
select throws_ok(
  $$update public.set_items set pinned_revision_id = (select current_revision_id from public.versions where id = current_setting('test.version')::uuid)
    where id = current_setting('test.item')::uuid$$,
  '42501', null, 'R-05.5 a temporary MD does not move a song to another revision'
);
select is(pg_temp.pinned('test.item'), 1, 'R-05.2 the song stays on its revision');

-- The MD updates: to the version's current revision only.
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000a1'); end $$;
select is(
  public.update_pinned_revision(current_setting('test.item')::uuid),
  (select current_revision_id from public.versions where id = current_setting('test.version')::uuid),
  'R-05.2 Update moves the song to the version''s current revision'
);
select is(pg_temp.pinned('test.item'), 2, 'R-05.2 the set now plays revision 2');
do $$ begin perform pg_temp.login('00000000-0000-0000-0000-0000000000c1'); end $$;
select is(pg_temp.pinned('test.cleo_item'), 1, 'R-05.2 another band''s set is not affected');
select lives_ok(
  $$select public.update_pinned_revision(current_setting('test.cleo_item')::uuid)$$,
  'R-05.2 each band''s MD decides for their own sets'
);

do $$ begin perform pg_temp.logout(); end $$;
select * from finish();
rollback;
