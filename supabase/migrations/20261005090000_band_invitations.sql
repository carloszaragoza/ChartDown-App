-- T-701: creating a band, and inviting musicians by email (R-04.1, R-04.2, R-04.3, decision 2,
-- Technical Plan 4 and 8.1). Removing and leaving use the policy on band_members (T-304).
-- Rolled back by ../rollbacks/<same name>.

-- An invitation waits in the app for whoever signs in with that email (R-04.2). One pending
-- invitation per band and email; no expiry, the MD cancels it.
create table public.band_invitations (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  accepted boolean,
  check ((responded_at is null) = (accepted is null))
);
create unique index band_invitations_one_pending on public.band_invitations (band_id, email)
  where responded_at is null;
create index band_invitations_email_idx on public.band_invitations (email) where responded_at is null;
alter table public.band_invitations enable row level security;

-- The email the person signed in with, to match their invitations. Only theirs.
create function private.my_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = auth.uid();
$$;
revoke all on function private.my_email() from public, anon;
grant execute on function private.my_email() to authenticated;

revoke all on public.band_invitations from anon, authenticated;
grant select, delete on public.band_invitations to authenticated;
grant insert (id, band_id, email, invited_by) on public.band_invitations to authenticated;

create policy "band_invitations: the MD and the invitee read" on public.band_invitations
  for select to authenticated
  using (private.is_md(band_id) or (responded_at is null and email = private.my_email()));
create policy "band_invitations: the MD invites" on public.band_invitations
  for insert to authenticated
  with check (private.is_md(band_id) and invited_by = (select auth.uid()));
create policy "band_invitations: the MD cancels a pending one" on public.band_invitations
  for delete to authenticated using (private.is_md(band_id) and responded_at is null);

-- A new band, with its creator as its only MD (R-04.1, decision 2). Bands and members are closed
-- to inserts, so this runs as the definer and checks the person itself.
create function public.create_band(name text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  band uuid := gen_random_uuid();
  clean text := btrim(create_band.name);
begin
  if me is null then
    raise exception 'Sign in to create a band' using errcode = 'insufficient_privilege';
  end if;
  if char_length(coalesce(clean, '')) not between 1 and 80 then
    raise exception 'name_invalid' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.bands (id, name) values (band, clean);
  insert into public.band_members (band_id, user_id, role) values (band, me, 'md');
  return band;
end;
$$;

-- The MD invites someone by email (R-04.2). It never says whether that email has an account.
-- Inviting the same email again while one is pending gives the same invitation.
create function public.invite_to_band(band_id uuid, email text) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  clean text := lower(btrim(invite_to_band.email));
  personal boolean;
  invitation uuid;
begin
  if me is null or not private.is_md(invite_to_band.band_id) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  select b.is_personal into personal from public.bands b where b.id = invite_to_band.band_id;
  if personal then
    raise exception 'personal_space' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if clean is null or clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalid' using errcode = 'invalid_parameter_value';
  end if;
  if clean = private.my_email() then
    raise exception 'yourself' using errcode = 'invalid_parameter_value';
  end if;
  select i.id into invitation from public.band_invitations i
  where i.band_id = invite_to_band.band_id and i.email = clean and i.responded_at is null;
  if invitation is null then
    invitation := gen_random_uuid();
    insert into public.band_invitations (id, band_id, email, invited_by)
    values (invitation, invite_to_band.band_id, clean, me);
  end if;
  return invitation;
end;
$$;

-- The invitee accepts or declines (R-04.2). Accepting makes them a musician of the band, with
-- their profile's instruments as their default ones there (R-04.3). Members are closed to
-- inserts, so this runs as the definer and checks the invitation is theirs.
create function public.respond_to_invitation(invitation_id uuid, accept boolean) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  invitation public.band_invitations;
  member uuid;
begin
  select * into invitation from public.band_invitations i
  where i.id = respond_to_invitation.invitation_id and i.responded_at is null
    and i.email = private.my_email()
  for update;
  if me is null or not found then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  update public.band_invitations set responded_at = now(), accepted = coalesce(respond_to_invitation.accept, false)
  where id = invitation.id;
  if coalesce(respond_to_invitation.accept, false) then
    insert into public.band_members (band_id, user_id, role)
    values (invitation.band_id, me, 'musician')
    on conflict (band_id, user_id) do nothing
    returning id into member;
    if member is not null then
      insert into public.member_instruments (member_id, instrument_id)
      select member, u.instrument_id from public.user_instruments u where u.user_id = me;
    end if;
  end if;
  return invitation.band_id;
end;
$$;

-- The invitee's pending invitations, with what they need to decide: the band's name and who
-- invited them. They cannot read the band itself until they accept.
create function public.my_invitations()
returns table (id uuid, band_name text, invited_by_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, b.name, p.name, i.created_at
  from public.band_invitations i
  join public.bands b on b.id = i.band_id
  left join public.profiles p on p.id = i.invited_by
  where i.responded_at is null and auth.uid() is not null and i.email = private.my_email()
  order by i.created_at;
$$;

-- An invitation holds the invitee's email: it goes with their account (Technical Plan 12.5), on
-- whatever path the account is deleted.
create function private.forget_invitations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.band_invitations where email = lower(old.email);
  return old;
end;
$$;
revoke all on function private.forget_invitations() from public, anon, authenticated;
create trigger forget_band_invitations after delete on auth.users
  for each row execute function private.forget_invitations();

revoke all on function public.create_band(text), public.invite_to_band(uuid, text),
  public.respond_to_invitation(uuid, boolean), public.my_invitations() from public, anon;
grant execute on function public.create_band(text), public.invite_to_band(uuid, text),
  public.respond_to_invitation(uuid, boolean), public.my_invitations() to authenticated;
