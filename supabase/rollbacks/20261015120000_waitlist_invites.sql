-- Rolls back ../migrations/20261015120000_waitlist_invites.sql: who was invited, and with which
-- code, is forgotten; the codes themselves stay.

drop function public.invite_from_waitlist(uuid);
alter table public.waitlist drop column invited_at, drop column invited_code_id;
