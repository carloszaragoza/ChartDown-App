-- F-012: who may join a set's live session counts the set's effective lineup (R-12.2, R-12.12,
-- R-05.3): its own, or the band's default instruments when it has none, as set_song does. The
-- session, its channel, its notices and handing over all ask this function.
-- Rolled back by ../rollbacks/<same name>.

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
    ) or (
      not exists (select 1 from public.set_lineup l where l.set_id = may_join_live.set_id)
      and exists (
        select 1 from public.sets s
        join public.band_members m on m.band_id = s.band_id
        join public.member_instruments mi on mi.member_id = m.id
        where s.id = may_join_live.set_id and m.user_id = person
      )
    )
  );
$$;
