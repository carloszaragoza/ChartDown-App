-- T-704: “Update” moves a set's song to its version's current revision (R-05.2, decision 9.2,
-- Technical Plan 4). Rolled back by ../rollbacks/<same name>.

-- With the MD's own permissions; the trigger of T-304 keeps it to the MD, never a temporary MD.
-- Only to the version's current revision, the one its author published, never any other.
-- Returns the revision the song is pinned to now.
create function public.update_pinned_revision(item_id uuid) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  item public.set_items;
  current_revision uuid;
begin
  select * into item from public.set_items i where i.id = update_pinned_revision.item_id;
  if item.id is null or not private.is_md(private.band_of_set(item.set_id)) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  select v.current_revision_id into current_revision from public.versions v where v.id = item.version_id;
  if current_revision is null then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  if current_revision is distinct from item.pinned_revision_id then
    update public.set_items set pinned_revision_id = current_revision where id = item.id;
  end if;
  return current_revision;
end;
$$;
revoke all on function public.update_pinned_revision(uuid) from public, anon;
grant execute on function public.update_pinned_revision(uuid) to authenticated;
