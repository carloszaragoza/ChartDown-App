-- Rolls back ../migrations/20261022120000_music_end.sql: where the music ends is forgotten; the
-- video and the recording play to their own end again.

revoke update (music_end_ms) on public.band_audio from authenticated;
alter table public.band_audio drop column music_end_ms;
revoke update (video_end_ms) on public.versions from authenticated;
alter table public.versions drop column video_end_ms;
