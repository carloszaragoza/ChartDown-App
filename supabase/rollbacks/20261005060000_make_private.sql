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
