-- T-1202: accepting the Terms of Use and the Privacy Notice at sign-up. The version accepted
-- travels with the invite claim, which every way of signing up goes through, and lands on the
-- profile when the account is created (Technical Plan 4 and 8). Rolled back by
-- ../rollbacks/<same name>.

alter table public.invite_claims
  add column terms_version text check (char_length(terms_version) <= 40),
  add column terms_accepted_at timestamptz;
alter table public.profiles
  add column terms_version text check (char_length(terms_version) <= 40),
  add column terms_accepted_at timestamptz;

-- Step 1 of creating an account, now with the version of the terms the person accepted.
drop function public.claim_invite(text, text);
create function public.claim_invite(code text, email text, terms_version text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  typed text := upper(regexp_replace(coalesce(claim_invite.code, ''), '[^A-Za-z0-9]', '', 'g'));
  address text := lower(btrim(coalesce(claim_invite.email, '')));
  found uuid;
begin
  if char_length(typed) <> 8 or address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid';
  end if;
  select c.id into found from public.invite_codes c
  where c.code = left(typed, 4) || '-' || right(typed, 4)
    and c.revoked_at is null and (c.max_uses is null or c.uses < c.max_uses);
  if found is null then
    return 'invalid';
  end if;
  insert into public.invite_claims (code_id, email, terms_version, terms_accepted_at)
  values (found, address, nullif(btrim(claim_invite.terms_version), ''),
          case when nullif(btrim(claim_invite.terms_version), '') is null then null else now() end);
  return 'ok';
end;
$$;
revoke all on function public.claim_invite(text, text, text) from public;
grant execute on function public.claim_invite(text, text, text) to anon, authenticated;


-- Every new account's profile, with the terms it accepted.
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
