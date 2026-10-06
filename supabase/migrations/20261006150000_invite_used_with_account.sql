-- F-002: an invite code is used up only once the account really exists. The sign-up hook only
-- checks the claim; the trigger that creates the profile marks the claim and counts the use, in
-- the account's own transaction, so a failed sign-up (for example, the confirmation email could
-- not be sent) leaves the code usable (Technical Plan 12.1). Rolled back by
-- ../rollbacks/<same name>.

create or replace function private.hook_before_user_created(event jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  address text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  -- Only checks: the claim is used, and the code counted, once the account exists (F-002).
  if not exists (
    select 1 from public.invite_claims cl
    join public.invite_codes c on c.id = cl.code_id
    where cl.email = address and cl.used_at is null and cl.expires_at > now()
      and c.revoked_at is null and (c.max_uses is null or c.uses < c.max_uses)
  ) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'invite_required'));
  end if;
  return '{}'::jsonb;
end;
$$;

create or replace function private.create_profile_for_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  -- The claim this account was created from, and the terms accepted with it (T-1202).
  claim_id uuid;
  claimed_code uuid;
  accepted_version text;
  accepted_at timestamptz;
  given text := btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  ));
begin
  -- Now that the account exists, its claim is used and its code counted, in the account's own
  -- transaction: if creating the account fails, neither happens (F-002).
  select cl.id, cl.code_id, cl.terms_version, cl.terms_accepted_at
    into claim_id, claimed_code, accepted_version, accepted_at
  from public.invite_claims cl
  join public.invite_codes c on c.id = cl.code_id
  where cl.email = lower(btrim(coalesce(new.email, ''))) and cl.used_at is null and cl.expires_at > now()
    and c.revoked_at is null and (c.max_uses is null or c.uses < c.max_uses)
  order by cl.created_at desc
  limit 1
  for update of cl, c;
  if claim_id is not null then
    update public.invite_codes set uses = uses + 1 where id = claimed_code;
    update public.invite_claims set used_at = now(), user_id = new.id where id = claim_id;
  end if;

  insert into public.profiles (id, name, language, terms_version, terms_accepted_at)
  values (
    new.id,
    left(case when given = '' then 'Musician' else given end, 80),
    case when new.raw_user_meta_data ->> 'language' = 'es' then 'es' else 'en' end::public.interface_language,
    accepted_version,
    accepted_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
