-- T-702: a set's songs: adding, moving, removing, and duplicating a set (R-05.1, R-05.2, R-05.6,
-- Technical Plan 4). Creating, renaming and deleting sets use the policies of T-304.
-- Rolled back by ../rollbacks/<same name>.

-- All of them run with the person's own permissions, so the policies decide who may: the MD
-- adds and removes songs; the MD or the set's temporary MD reorders (R-05.5). Positions always
-- run 1..n; their uniqueness is checked at the end of the transaction while songs shift.

-- A version at the end of the set, pinned to its current revision (decision 9.2).
create function public.add_to_set(set_id uuid, version_id uuid) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  band uuid;
  pinned uuid;
  created uuid := gen_random_uuid();
begin
  select s.band_id into band from public.sets s where s.id = add_to_set.set_id;
  if me is null or band is null or not private.is_md(band) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  select v.current_revision_id into pinned from public.versions v where v.id = add_to_set.version_id;
  if pinned is null then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  -- One change to a set's order at a time.
  perform 1 from public.set_items i where i.set_id = add_to_set.set_id for update;
  insert into public.set_items (id, set_id, position, version_id, pinned_revision_id)
  select created, add_to_set.set_id, coalesce(max(i.position), 0) + 1, add_to_set.version_id, pinned
  from public.set_items i where i.set_id = add_to_set.set_id;
  return created;
end;
$$;

-- A song to another place; the others shift so positions stay 1..n.
create function public.move_in_set(item_id uuid, new_position integer) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare
  item public.set_items;
  last integer;
  target integer;
begin
  select * into item from public.set_items i where i.id = move_in_set.item_id;
  if item.id is null
     or not (private.is_md(private.band_of_set(item.set_id)) or private.is_temp_md(item.set_id)) then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  perform 1 from public.set_items i where i.set_id = item.set_id for update;
  select max(i.position) into last from public.set_items i where i.set_id = item.set_id;
  target := least(greatest(coalesce(move_in_set.new_position, item.position), 1), last);
  if target = item.position then
    return;
  end if;
  set constraints public.set_items_position_key deferred;
  if target < item.position then
    update public.set_items set position = position + 1
    where set_id = item.set_id and position >= target and position < item.position;
  else
    update public.set_items set position = position - 1
    where set_id = item.set_id and position > item.position and position <= target;
  end if;
  update public.set_items set position = target where id = item.id;
end;
$$;

-- A song out of the set; the ones after it move up.
create function public.remove_from_set(item_id uuid) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare
  item public.set_items;
begin
  select * into item from public.set_items i where i.id = remove_from_set.item_id;
  if item.id is null or not private.is_md(private.band_of_set(item.set_id)) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  perform 1 from public.set_items i where i.set_id = item.set_id for update;
  delete from public.set_items where id = item.id;
  set constraints public.set_items_position_key deferred;
  update public.set_items set position = position - 1
  where set_id = item.set_id and position > item.position;
end;
$$;

-- A copy of a set under a new name, without a date (R-05.6): its songs with their pinned
-- revisions and keys, and its lineup; never its temporary MD.
create function public.duplicate_set(set_id uuid, name text, date date default null) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  original public.sets;
  created uuid := gen_random_uuid();
begin
  select * into original from public.sets s where s.id = duplicate_set.set_id;
  if original.id is null or not private.is_md(original.band_id) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(duplicate_set.name, '')) = '' then
    raise exception 'name_invalid' using errcode = 'invalid_parameter_value';
  end if;
  begin
    insert into public.sets (id, band_id, name, date, type)
    values (created, original.band_id, btrim(duplicate_set.name), duplicate_set.date, original.type);
  exception when unique_violation then
    raise exception 'name_taken' using errcode = 'unique_violation';
  end;
  insert into public.set_items (set_id, position, version_id, pinned_revision_id, set_key)
  select created, i.position, i.version_id, i.pinned_revision_id, i.set_key
  from public.set_items i where i.set_id = original.id;
  insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select created, l.band_id, l.member_id, l.instrument_id
  from public.set_lineup l where l.set_id = original.id;
  return created;
end;
$$;

revoke all on function public.add_to_set(uuid, uuid), public.move_in_set(uuid, integer),
  public.remove_from_set(uuid), public.duplicate_set(uuid, text, date) from public, anon;
grant execute on function public.add_to_set(uuid, uuid), public.move_in_set(uuid, integer),
  public.remove_from_set(uuid), public.duplicate_set(uuid, text, date) to authenticated;
