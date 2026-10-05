-- Rolls back ../migrations/20261005090000_band_invitations.sql.
drop trigger if exists forget_band_invitations on auth.users;
drop function if exists private.forget_invitations();
drop function if exists public.my_invitations();
drop function if exists public.respond_to_invitation(uuid, boolean);
drop function if exists public.invite_to_band(uuid, text);
drop function if exists public.create_band(text);
drop table if exists public.band_invitations;
drop function if exists private.my_email();
