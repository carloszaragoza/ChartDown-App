-- T-505: the catalog (R-02.5, R-02.9, R-02.10, Technical Plan 4). Rolled back by
-- ../rollbacks/<same name>.

-- Songs with how many versions each has, in alphabetical order, 30 per page; it returns up to 31
-- rows so the page knows whether there is a next one. Only public versions, active or frozen,
-- count: the filter is here, not left to the read policies, because an owner or a band can read
-- private versions that must never appear (R-02.5). The text matches a song's title, one of its
-- artists or a counted version's album, ignoring case and taken literally; the source type
-- narrows the versions counted.
create function public.catalog(
  query text default null,
  source public.source_type default null,
  page integer default 1
) returns table (song_id uuid, title text, artists text[], versions integer)
language sql stable security invoker set search_path = '' as $$
  with wanted as (
    -- null when there is no text to search for
    select case when nullif(btrim(catalog.query), '') is not null then
      '%' || replace(replace(replace(btrim(catalog.query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    end as pattern
  ),
  listed as (
    select v.song_id, v.source_album
    from public.versions v
    where v.visibility = 'public' and v.status in ('active', 'frozen')
      and (catalog.source is null or v.source_type = catalog.source)
  )
  select s.id, s.title, s.artists, count(*)::integer
  from public.songs s
  join listed l on l.song_id = s.id
  cross join wanted w
  group by s.id, s.title, s.artists, w.pattern
  having w.pattern is null
    or s.title ilike w.pattern
    or exists (select 1 from unnest(s.artists) a where a ilike w.pattern)
    or coalesce(bool_or(l.source_album ilike w.pattern), false)
  order by lower(s.title), s.id
  limit 31 offset (greatest(catalog.page, 1) - 1) * 30;
$$;
revoke all on function public.catalog(text, public.source_type, integer) from public;
grant execute on function public.catalog(text, public.source_type, integer) to anon, authenticated;
