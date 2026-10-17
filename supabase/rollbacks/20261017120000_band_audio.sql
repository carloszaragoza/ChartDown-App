-- Rolls back ../migrations/20261017120000_band_audio.sql: the bands' recordings are forgotten.
-- The bucket's files are not deleted here (Storage removes them through its API); the bucket
-- stays, closed to everyone once its policies are gone.

drop policy "band-audio: the MD removes" on storage.objects;
drop policy "band-audio: the MD replaces" on storage.objects;
drop policy "band-audio: the MD uploads" on storage.objects;
drop policy "band-audio: members listen" on storage.objects;
drop function private.band_audio_object(text, boolean);
drop table public.band_audio;
drop function private.arranges_audio(uuid, uuid);
