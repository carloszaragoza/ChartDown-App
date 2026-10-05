-- T-603: saving a note of a band's MD layer (R-03.5, R-06.6, Technical Plan 4). Rolled back by
-- ../rollbacks/<same name>.

-- Runs with the person's own permissions, so the layer policies of Technical Plan 8.1 decide:
-- only the band's MD writes. In one transaction: the band's layer on the version, created with its
-- first note; the note, new or edited, anchored to the version's current revision; and its
-- instruments, replaced (none means everyone). New ids are chosen here rather than returned by
-- the inserts, because a note's read policy looks the note up again (see create_version).
create function public.save_layer_note(
  band_id uuid,
  version_id uuid,
  note_id uuid,
  section text,
  occurrence integer,
  bar integer,
  note_text text,
  instrument_ids uuid[]
) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  current_revision uuid;
  layer uuid;
  saved uuid := coalesce(save_layer_note.note_id, gen_random_uuid());
  clean text := btrim(save_layer_note.note_text);
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
    insert into public.layer_notes (id, layer_id, version_id, section, occurrence, bar, text, anchored_revision_id, created_by)
    values (saved, layer, save_layer_note.version_id, btrim(save_layer_note.section),
            save_layer_note.occurrence, save_layer_note.bar, clean, current_revision, me);
  else
    update public.layer_notes n
    set section = btrim(save_layer_note.section), occurrence = save_layer_note.occurrence,
        bar = save_layer_note.bar, text = clean, anchored_revision_id = current_revision,
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
revoke all on function public.save_layer_note(uuid, uuid, uuid, text, integer, integer, text, uuid[]) from public, anon;
grant execute on function public.save_layer_note(uuid, uuid, uuid, text, integer, integer, text, uuid[]) to authenticated;
