-- R-03.11, R-06.7, T-2830: where the music ends in a version's YouTube video and in a band's
-- recording, in milliseconds, so the player pauses there instead of playing on past the song.
-- Optional: with none the video or the recording plays to its own end. Saved like where the music
-- starts: the video's by the version's owner (the column grant below, under the existing policy
-- "versions: the owner edits"), the recording's by the band's MD (under band_audio's update policy).
-- Rolled back by ../rollbacks/<same name>.
alter table public.versions
  add column video_end_ms integer
  constraint versions_video_end_ms_range check (video_end_ms between 1 and 3600000);

grant update (video_end_ms) on public.versions to authenticated;

alter table public.band_audio
  add column music_end_ms integer
  constraint band_audio_music_end_ms_range check (music_end_ms between 1 and 3600000);

grant update (music_end_ms) on public.band_audio to authenticated;
