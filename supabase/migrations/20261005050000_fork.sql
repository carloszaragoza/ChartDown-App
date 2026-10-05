-- T-503: forking a version (R-02.6, R-02.7, Technical Plan 4). Rolled back by
-- ../rollbacks/<same name>.

-- Runs with the person's own permissions: they must be able to read the original, and the new
-- version is theirs, public and active (Technical Plan 8.1). Only a public version is forked, so
-- a band member never publishes a private chart they can read through a set. The MD layer stays
-- with the original. New ids are chosen here, not returned by the inserts (see create_version).
create function public.fork_version(version_id uuid) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  original public.versions;
  chart text;
  my_name text;
  created uuid := gen_random_uuid();
  first_revision uuid := gen_random_uuid();
begin
  if me is null then
    raise exception 'Sign in to fork a version' using errcode = 'insufficient_privilege';
  end if;
  select * into original from public.versions v where v.id = fork_version.version_id;
  if not found then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  if original.visibility <> 'public' or original.status not in ('active', 'frozen') then
    raise exception 'not_public' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if original.owner_id = me then
    raise exception 'own_version' using errcode = 'object_not_in_prerequisite_state';
  end if;
  select r.content into chart from public.revisions r where r.id = original.current_revision_id;
  if chart is null then
    raise exception 'not_found' using errcode = 'insufficient_privilege';
  end if;
  select p.name into my_name from public.profiles p where p.id = me;

  insert into public.versions (
    id, song_id, owner_id, author_name, forked_from_id,
    source_type, source_album, source_year, source_youtube_url
  ) values (
    created, original.song_id, me, my_name, original.id,
    original.source_type, original.source_album, original.source_year, original.source_youtube_url
  );
  insert into public.revisions (id, version_id, number, content, author_id)
  values (first_revision, created, 1, chart, me);
  update public.versions set current_revision_id = first_revision where id = created;
  return created;
end;
$$;
revoke all on function public.fork_version(uuid) from public, anon;
grant execute on function public.fork_version(uuid) to authenticated;
