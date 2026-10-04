-- T-402 tests (pgTAP): invite codes, claims, the sign-up hook and the waitlist.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

create function pg_temp.login(person uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', person, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.visitor() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
-- What Supabase Auth sends the hook before creating an account (email or a provider).
create function pg_temp.creating(email text, provider text default 'email') returns jsonb language sql as $$
  select jsonb_build_object('user', jsonb_build_object(
    'id', gen_random_uuid(), 'email', email, 'app_metadata', jsonb_build_object('provider', provider)));
$$;
create function pg_temp.refused(result jsonb) returns boolean language sql as $$
  select result -> 'error' ->> 'message' = 'invite_required' and (result -> 'error' ->> 'http_code')::int = 403;
$$;

-- Codes: a single-use one, a band code for two, and a revoked one.
insert into public.invite_codes (id, code, kind, max_uses) values
  ('00000000-0000-0000-0000-00000000c0d1', 'ABCD-EFGH', 'single_use', 1),
  ('00000000-0000-0000-0000-00000000c0d2', 'BAND-2222', 'band', 2);
insert into public.invite_codes (id, code, revoked_at) values ('00000000-0000-0000-0000-00000000c0d3', 'GHNE-3333', now());

insert into public.invite_codes (id) values ('00000000-0000-0000-0000-00000000c0d4');
select matches(
  (select code from public.invite_codes where id = '00000000-0000-0000-0000-00000000c0d4'),
  '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$', 'R-01.7 a new code is XXXX-XXXX without look-alike characters'
);
select throws_ok(
  $$insert into public.invite_codes (kind, max_uses) values ('single_use', 2)$$,
  '23514', null, 'R-01.7 a single-use code is used once'
);

-- No code, no account (R-01.7).
select ok(pg_temp.refused(private.hook_before_user_created(pg_temp.creating('nobody@example.test'))), 'R-01.7 no code, no account');
select ok(
  pg_temp.refused(private.hook_before_user_created(pg_temp.creating('nobody@example.test', 'google'))),
  'R-01.7 no code, no account with Google either'
);

-- Claiming a code (step 1 of signing up).
select is(public.claim_invite('nope-nope', 'ana@example.test'), 'invalid', 'R-01.7 an unknown code is refused');
select is(public.claim_invite('GHNE-3333', 'ana@example.test'), 'invalid', 'R-01.7 a revoked code is refused');
select is(public.claim_invite('ABCD-EFGH', 'not an email'), 'invalid', 'R-01.7 a claim needs an email address');
select is(public.claim_invite(' abcd efgh ', ' Ana@Example.test '), 'ok', 'R-01.7 a code is accepted whatever its case or spacing');
select is((select email from public.invite_claims order by created_at desc limit 1), 'ana@example.test', 'R-01.7 the claim keeps the email, ignoring case');

-- The hook lets the claimed email in, once.
select is(private.hook_before_user_created(pg_temp.creating('ANA@example.test')), '{}'::jsonb, 'R-01.7 a valid code creates the account');
select is((select uses from public.invite_codes where code = 'ABCD-EFGH'), 1, 'R-01.7 creating the account uses up the code');
select is((select count(*)::int from public.invite_claims where used_at is not null and user_id is not null), 1, 'R-01.7 the claim records the account it created');
select is(public.claim_invite('ABCD-EFGH', 'ben@example.test'), 'invalid', 'R-01.7 a used single-use code cannot be claimed again');
select ok(pg_temp.refused(private.hook_before_user_created(pg_temp.creating('ana@example.test'))), 'R-01.7 a used claim does not create a second account');

-- A band code lets several people in, up to its limit, by email or Google.
select is(public.claim_invite('BAND-2222', 'carl@example.test'), 'ok', 'R-01.7 a band code is claimed by a member');
select is(public.claim_invite('BAND-2222', 'dora@example.test'), 'ok', 'R-01.7 and by another');
select is(private.hook_before_user_created(pg_temp.creating('carl@example.test', 'google')), '{}'::jsonb, 'R-01.7 a band member joins with Google');
select is(private.hook_before_user_created(pg_temp.creating('dora@example.test')), '{}'::jsonb, 'R-01.7 another band member joins');
select is(public.claim_invite('BAND-2222', 'eve@example.test'), 'invalid', 'R-01.7 a band code stops at its limit');

-- A claim lasts 30 minutes; the Admin can revoke a code in between.
insert into public.invite_codes (code) values ('LATE-4444');
select is(public.claim_invite('LATE-4444', 'late@example.test'), 'ok', 'a claim is recorded');
update public.invite_claims set expires_at = now() - interval '1 minute' where email = 'late@example.test';
select ok(pg_temp.refused(private.hook_before_user_created(pg_temp.creating('late@example.test'))), 'R-01.7 an expired claim creates no account');

-- The waitlist (R-01.8).
do $$ begin perform pg_temp.visitor(); end $$;
select lives_ok($$select public.join_waitlist(' Fan@Example.test ', 'es')$$, 'R-01.8 a visitor without a code joins the waitlist');
select lives_ok($$select public.join_waitlist('fan@example.test')$$, 'R-01.8 joining twice gives the same answer');
select throws_ok($$select public.join_waitlist('not an email')$$, '22023', null, 'R-01.8 the waitlist needs an email address');
select is((select count(*)::int from public.waitlist) + (select count(*)::int from public.invite_codes), 0, 'R-01.8 a visitor reads neither the waitlist nor the codes');
do $$ begin perform pg_temp.logout(); end $$;
select results_eq(
  'select email, language::text from public.waitlist',
  $$values ('fan@example.test', 'es')$$,
  'R-01.8 the waitlist stores the email once, with its language'
);

-- Only Supabase Auth runs the hook.
select ok(
  not has_function_privilege('anon', 'private.hook_before_user_created(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'private.hook_before_user_created(jsonb)', 'execute')
    and has_function_privilege('supabase_auth_admin', 'private.hook_before_user_created(jsonb)', 'execute'),
  'R-01.7 only Supabase Auth runs the sign-up hook'
);

select * from finish();
rollback;
