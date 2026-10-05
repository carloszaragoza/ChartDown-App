-- T-801: a song of a set as the person opening it may see it (R-06.1 to R-06.4, Technical Plan
-- 5). Rolled back by ../rollbacks/<same name>.

-- With the person's own permissions, so row-level security is the second barrier: nobody outside
-- the band gets anything. One answer that offline download (T-902) can store as it is: the pinned
-- revision, the set's key, the person's role and instruments in this set, whether the band hides
-- the author's notes, and the layer notes they may see. A musician gets the general notes and
-- those for their instruments in this set (its lineup, or the band's defaults while it has none);
-- the MD and the set's temporary MD get them all.
create function public.set_song(set_id uuid, song_position integer) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  the_set public.sets;
  member public.band_members;
  viewer text;
  item record;
  mine uuid[];
  hidden boolean;
begin
  select * into the_set from public.sets s where s.id = set_song.set_id;
  select * into member from public.band_members m where m.band_id = the_set.band_id and m.user_id = me;
  if me is null or the_set.id is null or member.id is null then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  viewer := case
    when member.role = 'md' then 'md'
    when private.is_temp_md(set_song.set_id) then 'temp_md'
    else 'musician'
  end;

  select i.id, i.version_id, i.set_key, i.pinned_revision_id, r.number, r.content,
         v.author_name, v.current_revision_id, s.title
  into item
  from public.set_items i
  join public.revisions r on r.id = i.pinned_revision_id
  join public.versions v on v.id = i.version_id
  join public.songs s on s.id = v.song_id
  where i.set_id = set_song.set_id and i.position = set_song.song_position;
  if not found then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;

  mine := case
    when exists (select 1 from public.set_lineup l where l.set_id = set_song.set_id) then
      array(select l.instrument_id from public.set_lineup l where l.set_id = set_song.set_id and l.member_id = member.id)
    else
      array(select mi.instrument_id from public.member_instruments mi where mi.member_id = member.id)
  end;
  select l.hide_author_notes into hidden from public.layers l
  where l.band_id = the_set.band_id and l.version_id = item.version_id;

  return jsonb_build_object(
    'set_id', the_set.id,
    'set_name', the_set.name,
    'position', set_song.song_position,
    'item_id', item.id,
    'version_id', item.version_id,
    'title', item.title,
    'author_name', item.author_name,
    'set_key', item.set_key,
    'revision_id', item.pinned_revision_id,
    'revision_number', item.number,
    'current_revision_id', item.current_revision_id,
    'content', item.content,
    'role', viewer,
    'instruments', coalesce(
      (select jsonb_agg(ins.slug order by ins.slug) from public.instruments ins where ins.id = any(mine)), '[]'::jsonb),
    'hide_author_notes', coalesce(hidden, false),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'section', n.section, 'occurrence', n.occurrence, 'bar', n.bar, 'text', n.text,
        'anchored_revision_id', n.anchored_revision_id,
        'instruments', coalesce((
          select jsonb_agg(ins.slug order by ins.slug)
          from public.layer_note_instruments ni join public.instruments ins on ins.id = ni.instrument_id
          where ni.note_id = n.id), '[]'::jsonb)
      ) order by n.created_at, n.id)
      from public.layer_notes n
      join public.layers l on l.id = n.layer_id
      where l.band_id = the_set.band_id and n.version_id = item.version_id
        and (
          viewer <> 'musician'
          or not exists (select 1 from public.layer_note_instruments ni where ni.note_id = n.id)
          or exists (select 1 from public.layer_note_instruments ni where ni.note_id = n.id and ni.instrument_id = any(mine))
        )
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.set_song(uuid, integer) from public, anon;
grant execute on function public.set_song(uuid, integer) to authenticated;
