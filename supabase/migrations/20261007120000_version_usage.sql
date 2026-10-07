-- Credit in numbers (R-02.11, T-1308): the author of a public version sees how many bands and how
-- many musicians have it in a set. Totals only: no id or name of a band, set or person ever
-- leaves this function, and it answers only about the asker's own public versions. It runs with
-- the owner's rights because other bands' sets are closed to the author (Technical Plan 8.1).
-- One row per version, and a last row with no version: the totals across all of them, each band
-- and each musician counted once.

create function public.version_usage(days integer default null)
returns table (version_id uuid, bands integer, musicians integer)
language sql stable security definer set search_path = '' as $$
  with mine as (
    -- The asker's public versions, active or frozen; private and hidden ones are not counted.
    select v.id
    from public.versions v
    where v.owner_id = auth.uid()
      and v.visibility = 'public'
      and v.status in ('active', 'frozen')
  ),
  uses as (
    -- Each set that has one of them, within the period: from `days` ago through today (UTC),
    -- or every set, undated and upcoming ones too, for all time.
    select distinct i.version_id, s.band_id
    from public.set_items i
    join public.sets s on s.id = i.set_id
    join mine m on m.id = i.version_id
    where days is null
      or (s.date is not null
          and s.date between (now() at time zone 'utc')::date - days
                         and (now() at time zone 'utc')::date)
  )
  select r.version_id, r.bands, r.musicians
  from (
    select m.id as version_id,
      -- Bands, personal spaces left out.
      (select count(distinct u.band_id)::integer
         from uses u join public.bands b on b.id = u.band_id
         where u.version_id = m.id and not b.is_personal) as bands,
      -- Musicians: the members of those bands and the owners of those personal spaces.
      (select count(distinct bm.user_id)::integer
         from uses u join public.band_members bm on bm.band_id = u.band_id
         where u.version_id = m.id) as musicians,
      0 as last
    from mine m
    union all
    select null,
      (select count(distinct u.band_id)::integer
         from uses u join public.bands b on b.id = u.band_id where not b.is_personal),
      (select count(distinct bm.user_id)::integer
         from uses u join public.band_members bm on bm.band_id = u.band_id),
      1
    where exists (select 1 from mine)
  ) r
  where auth.uid() is not null
    and (days is null or days in (7, 30))
  order by r.last;
$$;

revoke all on function public.version_usage(integer) from public, anon;
grant execute on function public.version_usage(integer) to authenticated;
