-- T-504: making a version private (R-02.4, decisions 6 and 9.4, Technical Plan 4 and 8.1).
-- Rolled back by ../rollbacks/<same name>.

-- A frozen version is edited by nobody: its owner adds revisions and changes the current
-- revision or the source only while it is active.
create function private.owns_active_version(version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.versions
    where id = version and owner_id = auth.uid() and status = 'active'
  );
$$;
revoke all on function private.owns_active_version(uuid) from public, anon;
grant execute on function private.owns_active_version(uuid) to authenticated;

drop policy "revisions: the owner adds, as themselves" on public.revisions;
create policy "revisions: the owner adds, as themselves, while active" on public.revisions
  for insert to authenticated
  with check (author_id = (select auth.uid()) and private.owns_active_version(version_id));

drop policy "versions: the owner edits" on public.versions;
create policy "versions: the owner edits, while active" on public.versions
  for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'active')
  with check (owner_id = (select auth.uid()) and status = 'active');

-- Status and visibility have no update permission for anyone (8.1), so this flow runs as the
-- definer and checks the owner itself. In one transaction: a private copy for the owner, with the
-- current chart as revision 1, and the public version frozen under the author's name. Nothing is
-- deleted; sets, layers and forks keep pointing to the public version (decision 6).
create function public.make_private(version_id uuid) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  original public.versions;
  chart text;
  created uuid := gen_random_uuid();
  first_revision uuid := gen_random_uuid();
begin
  if me is null then
    raise exception 'Sign in to make a version private' using errcode = 'insufficient_privilege';
  end if;
  select * into original from public.versions v
  where v.id = make_private.version_id
  for update;
  if not found or original.owner_id is distinct from me then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  if original.visibility <> 'public' or original.status <> 'active' then
    raise exception 'not_active_public' using errcode = 'object_not_in_prerequisite_state';
  end if;
  select r.content into chart from public.revisions r where r.id = original.current_revision_id;

  insert into public.versions (
    id, song_id, owner_id, author_name, visibility, status,
    source_type, source_album, source_year, source_youtube_url
  ) values (
    created, original.song_id, me, original.author_name, 'private', 'active',
    original.source_type, original.source_album, original.source_year, original.source_youtube_url
  );
  insert into public.revisions (id, version_id, number, content, author_id)
  values (first_revision, created, 1, coalesce(chart, ''), me);
  update public.versions set current_revision_id = first_revision where id = created;

  update public.versions set status = 'frozen', updated_at = now() where id = original.id;
  return created;
end;
$$;
revoke all on function public.make_private(uuid) from public, anon;
grant execute on function public.make_private(uuid) to authenticated;
