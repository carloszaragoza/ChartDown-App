-- T-2848: a song's title and artists changed from the Chart editor (R-02.2; the owner's decision,
-- October 27, 2026, after a beta report). The song is shared by all its versions, so its own
-- version's owner may rename it only while every version of the song is theirs, and nobody
-- else's chart changes name; an administrator always may. Songs keep no direct update for others.
-- Rolled back by ../rollbacks/<same name>.

-- Whether the person signed in may rename the song of this version: an administrator, or the
-- version's owner while every version of the song is theirs (an orphaned one counts as someone
-- else's). Hidden versions count too, though the person can't read them.
create function public.can_rename_song(version_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_admin() or exists (
      select 1 from public.versions v
      where v.id = can_rename_song.version_id and v.status = 'active' and v.owner_id = auth.uid()
        and not exists (
          select 1 from public.versions o
          where o.song_id = v.song_id and o.owner_id is distinct from auth.uid()
        )
    )
  );
$$;

-- Renames the song of this version, its title and its artists, when can_rename_song allows it.
create function public.rename_song(version_id uuid, new_title text, new_artists text[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  song uuid;
  clean_title text := btrim(coalesce(new_title, ''));
  clean_artists text[] := array(
    select btrim(artist) from unnest(coalesce(new_artists, '{}')) as artist
    where artist is not null and btrim(artist) <> ''
  );
begin
  if not public.can_rename_song(rename_song.version_id) then
    raise exception 'not allowed to rename this song' using errcode = '42501';
  end if;
  select v.song_id into song from public.versions v where v.id = rename_song.version_id;
  update public.songs s set title = clean_title, artists = clean_artists, updated_at = now()
  where s.id = song;
end;
$$;

revoke all on function public.can_rename_song(uuid) from public, anon;
revoke all on function public.rename_song(uuid, text, text[]) from public, anon;
grant execute on function public.can_rename_song(uuid) to authenticated;
grant execute on function public.rename_song(uuid, text, text[]) to authenticated;
