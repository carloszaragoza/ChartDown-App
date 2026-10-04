-- Rolls back ../migrations/20261004190000_profile_on_signup.sql.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists private.create_profile_for_account();
