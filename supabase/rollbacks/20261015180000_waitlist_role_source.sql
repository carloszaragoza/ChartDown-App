-- Rolls back ../migrations/20261015180000_waitlist_role_source.sql: roles and sources are
-- forgotten, and joining takes an email and a language again.

drop function public.join_waitlist(text, text, text, text);
create function public.join_waitlist(email text, language text default 'en') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  address text := lower(btrim(coalesce(join_waitlist.email, '')));
begin
  if address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Not an email address' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.waitlist (email, language)
  values (address, case when join_waitlist.language = 'es' then 'es' else 'en' end::public.interface_language)
  on conflict on constraint waitlist_email_key do nothing;
end;
$$;
revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;
alter table public.waitlist drop column source, drop column role;
