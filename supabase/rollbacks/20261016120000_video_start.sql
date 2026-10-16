-- Rolls back ../migrations/20261016120000_video_start.sql: where the music starts in a version's
-- video is forgotten; the sections bar starts at the video's own start again.

revoke update (video_start_ms) on public.versions from authenticated;
alter table public.versions drop column video_start_ms;
