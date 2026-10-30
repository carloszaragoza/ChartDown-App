-- Rolls back ../migrations/20261029120000_live_default_lineup.sql: only the set's own lineup
-- joins its live session again.

create or replace function private.may_join_live(set_id uuid, person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select person is not null and (
    exists (
      select 1 from public.sets s join public.band_members m on m.band_id = s.band_id
      where s.id = may_join_live.set_id and m.user_id = person and m.role = 'md'
    ) or exists (
      select 1 from public.set_temp_md t join public.band_members m on m.id = t.member_id
      where t.set_id = may_join_live.set_id and m.user_id = person
        and (t.until is null or t.until >= current_date)
    ) or exists (
      select 1 from public.set_lineup l join public.band_members m on m.id = l.member_id
      where l.set_id = may_join_live.set_id and m.user_id = person
    )
  );
$$;
