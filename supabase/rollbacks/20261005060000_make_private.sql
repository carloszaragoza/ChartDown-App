-- Rolls back ../migrations/20261005060000_make_private.sql: the earlier policies come back.
drop function if exists public.make_private(uuid);

drop policy if exists "versions: the owner edits, while active" on public.versions;
create policy "versions: the owner edits" on public.versions
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "revisions: the owner adds, as themselves, while active" on public.revisions;
create policy "revisions: the owner adds, as themselves" on public.revisions
  for insert to authenticated
  with check (author_id = (select auth.uid()) and private.owns_version(version_id));

drop function if exists private.owns_active_version(uuid);

-- save_revision and restore_revision as T-502 left them.
create or replace function public.save_revision(version_id uuid, content text) returns uuid
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

create or replace function public.restore_revision(revision_id uuid) returns uuid
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
