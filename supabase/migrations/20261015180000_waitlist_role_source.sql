-- T-1310: the waitlist keeps the person's role and where they joined (R-01.8, Technical Plan 3).
-- Rolled back by ../rollbacks/<same name>.

alter table public.waitlist
  add column role text check (role in ('music_director', 'musician', 'teacher')),
  add column source text check (source in ('hero', 'final_cta', 'sign_up'));

-- Joining answers the same whether or not the email is already on it. A second visit that gives
-- a role fills one the first visit left empty; nothing else changes.
drop function public.join_waitlist(text, text);
create function public.join_waitlist(
  email text,
  language text default 'en',
  role text default null,
  source text default null
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  address text := lower(btrim(coalesce(join_waitlist.email, '')));
  given_role text := case when join_waitlist.role in ('music_director', 'musician', 'teacher')
    then join_waitlist.role end;
  given_source text := case when join_waitlist.source in ('hero', 'final_cta', 'sign_up')
    then join_waitlist.source end;
begin
  if address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Not an email address' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.waitlist as w (email, language, role, source)
  values (address,
    case when join_waitlist.language = 'es' then 'es' else 'en' end::public.interface_language,
    given_role, given_source)
  -- The constraint by name: the parameter called email would make the column ambiguous.
  on conflict on constraint waitlist_email_key do update
    set role = coalesce(w.role, excluded.role);
end;
$$;
revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;
