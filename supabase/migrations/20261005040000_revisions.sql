-- T-502: saving and restoring revisions (R-02.8, Technical Plan 4). Rolled back by
-- ../rollbacks/<same name>.

-- Both run with the person's own permissions: the policies of Technical Plan 8.1 decide who may
-- add a revision. Locking the version (FOR UPDATE, which only its owner may do) numbers saves made
-- at the same time one after the other. New ids are chosen here, not returned by the inserts,
-- for the same reason as in create_version.

-- A new revision of an active version, numbered after its last, made current.
create function public.save_revision(version_id uuid, content text) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  state public.version_status;
  created uuid := gen_random_uuid();
begin
  select v.status into state from public.versions v
  where v.id = save_revision.version_id and v.owner_id = me
  for update;
  if not found then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  if state <> 'active' then
    raise exception 'version_not_active' using errcode = 'object_not_in_prerequisite_state';
  end if;

  insert into public.revisions (id, version_id, number, content, author_id)
  select created, save_revision.version_id, coalesce(max(r.number), 0) + 1, save_revision.content, me
  from public.revisions r where r.version_id = save_revision.version_id;

  update public.versions set current_revision_id = created, updated_at = now()
  where id = save_revision.version_id;
  return created;
end;
$$;

-- Going back: a new revision with an earlier one's content, pointing to it. Nothing is changed.
create function public.restore_revision(revision_id uuid) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  earlier public.revisions;
  state public.version_status;
  now_current uuid;
  created uuid := gen_random_uuid();
begin
  select * into earlier from public.revisions r where r.id = restore_revision.revision_id;
  if not found then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  select v.status, v.current_revision_id into state, now_current from public.versions v
  where v.id = earlier.version_id and v.owner_id = me
  for update;
  if not found then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  if state <> 'active' then
    raise exception 'version_not_active' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if now_current = earlier.id then
    raise exception 'already_current' using errcode = 'object_not_in_prerequisite_state';
  end if;

  insert into public.revisions (id, version_id, number, content, author_id, restored_from_id)
  select created, earlier.version_id, coalesce(max(r.number), 0) + 1, earlier.content, me, earlier.id
  from public.revisions r where r.version_id = earlier.version_id;

  update public.versions set current_revision_id = created, updated_at = now()
  where id = earlier.version_id;
  return created;
end;
$$;

revoke all on function public.save_revision(uuid, text), public.restore_revision(uuid) from public, anon;
grant execute on function public.save_revision(uuid, text), public.restore_revision(uuid) to authenticated;
