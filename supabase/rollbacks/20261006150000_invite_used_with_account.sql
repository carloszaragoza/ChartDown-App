-- Rolls back ../migrations/20261006150000_invite_used_with_account.sql.
create or replace function private.hook_before_user_created(event jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  address text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  claim_id uuid;
  claimed_code uuid;
begin
  select cl.id, cl.code_id into claim_id, claimed_code
  from public.invite_claims cl
  join public.invite_codes c on c.id = cl.code_id
  where cl.email = address and cl.used_at is null and cl.expires_at > now()
    and c.revoked_at is null and (c.max_uses is null or c.uses < c.max_uses)
  order by cl.created_at desc
  limit 1
  for update of c;
  if claim_id is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'invite_required'));
  end if;
  update public.invite_codes set uses = uses + 1 where id = claimed_code;
  update public.invite_claims set used_at = now(), user_id = (event -> 'user' ->> 'id')::uuid where id = claim_id;
  return '{}'::jsonb;
end;
$$;

create or replace function private.create_profile_for_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  -- The terms accepted with the invite code this account was created from (T-1202).
  accepted_version text;
  accepted_at timestamptz;
  given text := btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  ));
begin
  select cl.terms_version, cl.terms_accepted_at into accepted_version, accepted_at from public.invite_claims cl
  where cl.user_id = new.id order by cl.used_at desc nulls last limit 1;
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
