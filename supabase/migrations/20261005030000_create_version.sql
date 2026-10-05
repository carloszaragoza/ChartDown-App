-- T-501: create a song (or use an existing one) and a version of it, with its first revision,
-- in one transaction (R-02.1 to R-02.3, Technical Plan 4). Rolled back by ../rollbacks/<same name>.

-- Runs with the person's own permissions, so every policy of Technical Plan 8.1 applies: the
-- version is theirs, public and active, and only its owner adds its revision.
create function public.create_version(
  song_id uuid,
  new_title text,
  new_artists text[],
  author_name text,
  content text,
  source_type public.source_type,
  source_album text default null,
  source_year smallint default null,
  source_youtube_url text default null
) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  song uuid := create_version.song_id;
  created uuid;
  first_revision uuid;
begin
  if me is null then
    raise exception 'Sign in to publish a version' using errcode = 'insufficient_privilege';
  end if;
  -- The source is required (R-02.2); said in words, not only by the column's constraint.
  if create_version.source_type is null then
    raise exception 'source_required' using errcode = 'not_null_violation';
  end if;
  if song is null then
    insert into public.songs (title, artists)
    values (btrim(create_version.new_title), coalesce(create_version.new_artists, '{}'))
    returning id into song;
  end if;

  insert into public.versions (song_id, owner_id, author_name, source_type, source_album, source_year, source_youtube_url)
  values (
    song, me, btrim(create_version.author_name), create_version.source_type,
    nullif(btrim(create_version.source_album), ''), create_version.source_year,
    nullif(btrim(create_version.source_youtube_url), '')
  )
  returning id into created;

  insert into public.revisions (version_id, number, content, author_id)
  values (created, 1, create_version.content, me)
  returning id into first_revision;

  update public.versions set current_revision_id = first_revision where id = created;
  return created;
end;
$$;
revoke all on function public.create_version(uuid, text, text[], text, text, public.source_type, text, smallint, text) from public, anon;
grant execute on function public.create_version(uuid, text, text[], text, text, public.source_type, text, smallint, text) to authenticated;
