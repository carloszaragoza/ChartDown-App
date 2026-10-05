-- T-405: a person deletes their own account (R-01.6, Technical Plan 12.5).
-- Rolled back by ../rollbacks/<same name> (Postgres cannot drop an enum value, so the event
-- type added here stays until the events migration is rolled back too).

-- When a band's MD leaves by deleting their account, the band learns who is MD now.
alter type public.event_type add value if not exists 'band_md_changed';

-- Deletes the signed-in person's account and everything personal, in one transaction, after
-- they confirm with their email. Their public versions stay, credited to "ChartDown".
create function public.delete_my_account(confirm_email text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_email text;
  my_members uuid[];
  my_space uuid;
  band uuid;
  successor uuid;
begin
  if me is null then
    raise exception 'Sign in to delete your account' using errcode = 'insufficient_privilege';
  end if;
  select lower(email) into my_email from auth.users where id = me;
  if my_email is null or lower(btrim(coalesce(confirm_email, ''))) <> my_email then
    raise exception 'The email does not match this account' using errcode = 'invalid_parameter_value';
  end if;
  select array_agg(id) into my_members from public.band_members where user_id = me;
  select id into my_space from public.bands where personal_owner_id = me;

  -- Bands they lead, with others in them: the longest-standing member becomes the MD.
  for band in
    select m.band_id from public.band_members m join public.bands b on b.id = m.band_id
    where m.user_id = me and m.role = 'md' and not b.is_personal
  loop
    delete from public.band_members where band_id = band and user_id = me;
    select id into successor from public.band_members where band_id = band order by joined_at, id limit 1;
    if successor is not null then
      update public.band_members set role = 'md' where id = successor;
      insert into public.event_outbox (type, detail)
      values ('band_md_changed', jsonb_build_object(
        'band_id', band, 'member_id', successor,
        'user_id', (select user_id from public.band_members where id = successor),
        'reason', 'previous_md_left'));
    end if;
  end loop;

  -- Their private versions go, with the set songs and layers that used them.
  delete from public.set_items where version_id in (
    select id from public.versions where owner_id = me and visibility = 'private');
  delete from public.layers where version_id in (
    select id from public.versions where owner_id = me and visibility = 'private');
  delete from public.versions where owner_id = me and visibility = 'private';

  -- Their public versions stay with the community, credited to "ChartDown".
  update public.versions set owner_id = null, author_name = 'ChartDown', updated_at = now() where owner_id = me;

  delete from public.waitlist where email = my_email;
  delete from public.invite_claims where user_id = me or email = my_email;

  -- The account: its sign-in methods, profile and everything that belongs to the profile.
  delete from auth.users where id = me;

  -- Last, because the deletes above write events too: none may name them.
  delete from public.event_outbox e
  where e.detail ->> 'user_id' = me::text
     or e.detail ->> 'author_id' = me::text
     or e.detail ->> 'member_id' = any (coalesce(my_members, '{}')::text[])
     or e.detail ->> 'band_id' = my_space::text;
end;
$$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
