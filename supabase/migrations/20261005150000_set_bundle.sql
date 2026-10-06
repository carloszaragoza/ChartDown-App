-- T-902: everything a person sees in a set, to keep on their device and read with no internet
-- (R-08.1, R-08.2, Technical Plan 6). Rolled back by ../rollbacks/<same name>.

-- With the person's own permissions. Each song is exactly what set_song gives that person, so a
-- musician's bundle never holds another instrument's notes (R-06.4). The stamp, a hash of the
-- rest, tells T-903 whether the set changed since it was downloaded.
create function public.set_bundle(set_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  the_set public.sets;
  band public.bands;
  own_lineup boolean;
  songs jsonb;
  bundle jsonb;
begin
  select * into the_set from public.sets s where s.id = set_bundle.set_id;
  if auth.uid() is null or the_set.id is null or not private.is_member(the_set.band_id) then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  select * into band from public.bands b where b.id = the_set.band_id;
  own_lineup := exists (select 1 from public.set_lineup l where l.set_id = set_bundle.set_id);

  songs := coalesce((
    select jsonb_agg(public.set_song(set_bundle.set_id, i.position) order by i.position)
    from public.set_items i where i.set_id = set_bundle.set_id
  ), '[]'::jsonb);

  bundle := jsonb_build_object(
    'set', jsonb_build_object(
      'id', the_set.id, 'name', the_set.name, 'type', the_set.type, 'date', the_set.date,
      'time', the_set.time, 'band', band.name, 'personal', band.is_personal
    ),
    -- Who plays what: the set's lineup, or the band's defaults while it has none (R-05.3).
    'lineup', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', p.name,
        'role', m.role,
        'instruments', coalesce((
          select jsonb_agg(ins.slug order by ins.slug)
          from public.instruments ins
          where ins.id in (
            select l.instrument_id from public.set_lineup l
            where own_lineup and l.set_id = set_bundle.set_id and l.member_id = m.id
            union
            select mi.instrument_id from public.member_instruments mi
            where not own_lineup and mi.member_id = m.id
          )
        ), '[]'::jsonb)
      ) order by m.joined_at)
      from public.band_members m join public.profiles p on p.id = m.user_id
      where m.band_id = the_set.band_id
    ), '[]'::jsonb),
    'songs', songs,
    -- The charts the notes were anchored to, so the device can tell shifted sections (R-00.2).
    'anchored', coalesce((
      select jsonb_object_agg(r.id, r.content)
      from public.revisions r
      where r.id in (
        select (note ->> 'anchored_revision_id')::uuid
        from jsonb_array_elements(songs) song, jsonb_array_elements(song -> 'notes') note
      )
    ), '{}'::jsonb)
  );
  return bundle || jsonb_build_object('stamp', md5(bundle::text));
end;
$$;
revoke all on function public.set_bundle(uuid) from public, anon;
grant execute on function public.set_bundle(uuid) to authenticated;
