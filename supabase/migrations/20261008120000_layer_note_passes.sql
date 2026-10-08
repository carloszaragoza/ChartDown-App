-- T-1709: a note of the MD layer can be for one pass of a repeat, or several (R-03.6, ChartDown
-- 0.6 spec 9.1, specs/chartdown-layers-0.5.md). `passes` says when; the instruments (layer_note_instruments)
-- still say who, so the server's filter by instrument (R-06.4) is untouched. No passes: every pass.
-- Changes: the column and its update grant (the MD edits through save_layer_note), save_layer_note
-- (a ninth argument with a default, so every existing call works) and set_song (each note carries
-- its passes). Row-level security policies are not changed. Rolled back by ../rollbacks/<same name>.

alter table public.layer_notes
  add column passes integer[] not null default '{}'
  constraint layer_notes_passes_valid
    check (cardinality(passes) <= 8 and 1 <= all(passes) and 99 >= all(passes));
grant update (passes) on public.layer_notes to authenticated;

-- A function's arguments cannot change in place: the old one goes, the new one takes its grants.
drop function public.save_layer_note(uuid, uuid, uuid, text, integer, integer, text, uuid[]);
create function public.save_layer_note(
  band_id uuid,
  version_id uuid,
  note_id uuid,
  section text,
  occurrence integer,
  bar integer,
  note_text text,
  instrument_ids uuid[],
  passes integer[] default '{}'
) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  current_revision uuid;
  layer uuid;
  saved uuid := coalesce(save_layer_note.note_id, gen_random_uuid());
  clean text := btrim(save_layer_note.note_text);
  -- The passes in order, each once; none means every pass (ChartDown 0.6, spec 9.1).
  the_passes integer[] := coalesce(array(
    select distinct p from unnest(coalesce(save_layer_note.passes, '{}')) p order by p), '{}');
begin
  if me is null or not private.is_md(save_layer_note.band_id) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  if clean = '' or char_length(clean) > 280 or clean ~ '[\r\n]' then
    raise exception 'text_invalid' using errcode = 'invalid_parameter_value';
  end if;
  if btrim(coalesce(save_layer_note.section, '')) = ''
     or coalesce(save_layer_note.occurrence, 0) < 1
     or coalesce(save_layer_note.bar, 1) < 1 then
    raise exception 'anchor_invalid' using errcode = 'invalid_parameter_value';
  end if;
  if cardinality(the_passes) > 8 or exists (select 1 from unnest(the_passes) p where p < 1 or p > 99) then
    raise exception 'passes_invalid' using errcode = 'invalid_parameter_value';
  end if;
  select v.current_revision_id into current_revision
  from public.versions v where v.id = save_layer_note.version_id;
  if current_revision is null then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;

  select l.id into layer from public.layers l
  where l.band_id = save_layer_note.band_id and l.version_id = save_layer_note.version_id;
  if layer is null then
    layer := gen_random_uuid();
    insert into public.layers (id, band_id, version_id)
    values (layer, save_layer_note.band_id, save_layer_note.version_id);
  end if;

  if save_layer_note.note_id is null then
    insert into public.layer_notes (id, layer_id, version_id, section, occurrence, bar, text, passes, anchored_revision_id, created_by)
    values (saved, layer, save_layer_note.version_id, btrim(save_layer_note.section),
            save_layer_note.occurrence, save_layer_note.bar, clean, the_passes, current_revision, me);
  else
    update public.layer_notes n
    set section = btrim(save_layer_note.section), occurrence = save_layer_note.occurrence,
        bar = save_layer_note.bar, text = clean, passes = the_passes, anchored_revision_id = current_revision,
        updated_at = now()
    where n.id = save_layer_note.note_id and n.layer_id = layer;
    if not found then
      raise exception 'not_found' using errcode = 'insufficient_privilege';
    end if;
    delete from public.layer_note_instruments i where i.note_id = saved;
  end if;

  insert into public.layer_note_instruments (note_id, instrument_id)
  select distinct saved, unnest(coalesce(save_layer_note.instrument_ids, '{}'));
  return saved;
end;
$$;
revoke all on function public.save_layer_note(uuid, uuid, uuid, text, integer, integer, text, uuid[], integer[]) from public, anon;
grant execute on function public.save_layer_note(uuid, uuid, uuid, text, integer, integer, text, uuid[], integer[]) to authenticated;

-- A song of a set, with each note's passes. The same function as before; only the notes change.
create or replace function public.set_song(set_id uuid, song_position integer) returns jsonb
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
        'passes', to_jsonb(n.passes),
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
