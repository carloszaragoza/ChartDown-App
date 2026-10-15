-- T-1104: the Admin sees the waitlist and invites from it (R-07.5, Technical Plan 3). Rolled
-- back by ../rollbacks/<same name>.

alter table public.waitlist
  add column invited_code_id uuid references public.invite_codes (id) on delete set null,
  add column invited_at timestamptz;

-- Invite: a single-use code noted with the person's email, and the entry marked with it, in one
-- step. Inviting someone already invited gives back their code instead of a second one. The code
-- itself is logged by invite_codes' own trigger; this logs who it was for.
create function public.invite_from_waitlist(entry uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  waiting public.waitlist;
  made public.invite_codes;
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = 'insufficient_privilege';
  end if;
  select * into waiting from public.waitlist w where w.id = invite_from_waitlist.entry for update;
  if waiting.id is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if waiting.invited_code_id is not null then
    return (select c.code from public.invite_codes c where c.id = waiting.invited_code_id);
  end if;
  insert into public.invite_codes (kind, max_uses, note, created_by)
  values ('single_use', 1, waiting.email, auth.uid())
  returning * into made;
  update public.waitlist set invited_code_id = made.id, invited_at = now() where id = waiting.id;
  perform private.log_admin('waitlist_invited', 'waitlist', waiting.id::text,
    jsonb_build_object('email', waiting.email, 'code', made.code));
  return made.code;
end;
$$;
revoke all on function public.invite_from_waitlist(uuid) from public, anon;
grant execute on function public.invite_from_waitlist(uuid) to authenticated;
