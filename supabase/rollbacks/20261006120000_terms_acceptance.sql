-- Rolls back ../migrations/20261006120000_terms_acceptance.sql.
create or replace function private.create_profile_for_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  given text := btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  ));
begin
  insert into public.profiles (id, name, language)
  values (
    new.id,
    left(case when given = '' then 'Musician' else given end, 80),
    case when new.raw_user_meta_data ->> 'language' = 'es' then 'es' else 'en' end::public.interface_language
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop function public.claim_invite(text, text, text);
create function public.claim_invite(code text, email text) returns text
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
  insert into public.invite_claims (code_id, email) values (found, address);
  return 'ok';
end;
$$;
revoke all on function public.claim_invite(text, text) from public;
grant execute on function public.claim_invite(text, text) to anon, authenticated;

alter table public.profiles drop column terms_accepted_at, drop column terms_version;
alter table public.invite_claims drop column terms_accepted_at, drop column terms_version;
