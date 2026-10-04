-- T-401: every new account gets its profile (and through it, its personal space, R-04.7)
-- when it is created (R-01.1, Technical Plan 12.1). Rolled back by ../rollbacks/<same name>.

-- The name comes from the provider (full_name or name) or from the email; the language is
-- the one chosen in the app when signing up (R-01.5), English otherwise. Runs with the
-- owner's rights because profiles are closed to new accounts until they exist.
create function private.create_profile_for_account() returns trigger
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
revoke all on function private.create_profile_for_account() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.create_profile_for_account();
