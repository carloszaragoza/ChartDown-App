-- R-03.11, T-2503: where the music starts in the version's YouTube video, in milliseconds, so the
-- sections bar and the chart follow the video for everyone. Its owner saves it like the source's
-- other columns: the column grant below, under the existing policy "versions: the owner edits",
-- which only finds the owner's active versions.
alter table public.versions
  add column video_start_ms integer
  constraint versions_video_start_ms_range check (video_start_ms between 0 and 3600000);

grant update (video_start_ms) on public.versions to authenticated;
