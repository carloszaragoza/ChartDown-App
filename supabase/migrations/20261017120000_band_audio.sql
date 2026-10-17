-- T-2601: the band's audio (R-06.7, Technical Plan, data model). A recording of a version for a
-- band to practice with, private to the band like its layer: its members hear it; the band's MD,
-- or a temporary MD for a set with that version, adds, replaces and removes it. The file lives in
-- the private bucket band-audio at "<band>/<version>", with the same access.
-- Rolled back by ../rollbacks/<same name>.

create table public.band_audio (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  version_id uuid not null references public.versions (id) on delete cascade,
  path text not null,
  size_bytes integer not null check (size_bytes between 1 and 15728640),
  duration_ms integer not null check (duration_ms between 1 and 3600000),
  content_type text not null check (content_type in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a')),
  -- The waveform, drawn without downloading the file: up to 2000 peaks from 0 to 1000.
  peaks smallint[] not null default '{}'
    check (cardinality(peaks) <= 2000 and 0 <= all (peaks) and 1000 >= all (peaks)),
  music_start_ms integer not null default 0 check (music_start_ms between 0 and 3600000),
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  constraint band_audio_one_per_version unique (band_id, version_id),
  constraint band_audio_path check (path = band_id::text || '/' || version_id::text)
);
create index band_audio_version on public.band_audio (version_id);
alter table public.band_audio enable row level security;

-- Who may add, replace or remove a band's recording of a version.
create function private.arranges_audio(band uuid, version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (private.is_md(band) or private.is_temp_md_for_version(band, version))
    and private.can_read_version(version);
$$;
revoke all on function private.arranges_audio(uuid, uuid) from public, anon;
grant execute on function private.arranges_audio(uuid, uuid) to authenticated;

create policy "band_audio: members read" on public.band_audio
  for select to authenticated using (private.is_member(band_id));
create policy "band_audio: the MD adds, as themselves" on public.band_audio
  for insert to authenticated
  with check (added_by = (select auth.uid()) and private.arranges_audio(band_id, version_id));
create policy "band_audio: the MD moves where the music starts" on public.band_audio
  for update to authenticated
  using (private.arranges_audio(band_id, version_id))
  with check (private.arranges_audio(band_id, version_id));
create policy "band_audio: the MD removes" on public.band_audio
  for delete to authenticated using (private.arranges_audio(band_id, version_id));

revoke all on public.band_audio from anon;
revoke update on public.band_audio from authenticated;
grant update (music_start_ms) on public.band_audio to authenticated;

-- The bucket: private, MP3 and M4A only, at most 15 MB a file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('band-audio', 'band-audio', false, 15728640,
        array['audio/mpeg', 'audio/mp4', 'audio/x-m4a'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- A file's access from its name, "<band>/<version>"; any other name is nobody's.
create function private.band_audio_object(object_name text, writing boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  uuid_text constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  band uuid;
  version uuid;
begin
  if object_name !~ ('^' || uuid_text || '/' || uuid_text || '$') then
    return false;
  end if;
  band := split_part(object_name, '/', 1)::uuid;
  version := split_part(object_name, '/', 2)::uuid;
  if writing then
    return private.arranges_audio(band, version);
  end if;
  return private.is_member(band);
end;
$$;
revoke all on function private.band_audio_object(text, boolean) from public, anon;
grant execute on function private.band_audio_object(text, boolean) to authenticated;

create policy "band-audio: members listen" on storage.objects
  for select to authenticated
  using (bucket_id = 'band-audio' and private.band_audio_object(name, false));
create policy "band-audio: the MD uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'band-audio' and private.band_audio_object(name, true));
create policy "band-audio: the MD replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'band-audio' and private.band_audio_object(name, true))
  with check (bucket_id = 'band-audio' and private.band_audio_object(name, true));
create policy "band-audio: the MD removes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'band-audio' and private.band_audio_object(name, true));
