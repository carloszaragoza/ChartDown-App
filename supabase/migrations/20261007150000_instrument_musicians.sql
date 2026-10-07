-- T-1305: how many people chose each instrument, for the Admin's Instruments screen (R-07.3).
-- Admins still cannot read anyone's instruments (user_instruments is read-your-own); this returns
-- an instrument id and a count, never a person, and answers admins only.
-- Rolled back by ../rollbacks/<same name>.

create function public.instrument_musicians()
returns table (instrument_id uuid, musicians integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can count musicians per instrument' using errcode = 'insufficient_privilege';
  end if;
  return query
    select i.id, count(u.user_id)::integer
    from public.instruments i
    left join public.user_instruments u on u.instrument_id = i.id
    group by i.id;
end;
$$;
revoke all on function public.instrument_musicians() from public, anon;
grant execute on function public.instrument_musicians() to authenticated;
