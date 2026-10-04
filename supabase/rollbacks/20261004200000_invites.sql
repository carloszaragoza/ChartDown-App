-- Rolls back ../migrations/20261004200000_invites.sql: drops what it created, in reverse.
revoke usage on schema private from supabase_auth_admin;
revoke usage on schema private from service_role;
drop function if exists private.hook_before_user_created(jsonb);
drop function if exists public.join_waitlist(text, text);
drop function if exists public.claim_invite(text, text);
drop table if exists public.waitlist;
drop table if exists public.invite_claims;
drop table if exists public.invite_codes;
drop function if exists private.new_invite_code();
drop type if exists public.invite_kind;
