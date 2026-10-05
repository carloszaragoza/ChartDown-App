-- Rolls back ../migrations/20261005080000_layer_notes.sql.
drop function if exists public.save_layer_note(uuid, uuid, uuid, text, integer, integer, text, uuid[]);
