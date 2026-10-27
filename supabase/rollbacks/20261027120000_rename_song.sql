-- Rolls back ../migrations/20261027120000_rename_song.sql: only an administrator renames a song
-- again, through the songs table's own policy.

drop function public.rename_song(uuid, text, text[]);
drop function public.can_rename_song(uuid);
