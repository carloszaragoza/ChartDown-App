-- T-1202 tests (pgTAP): the Terms of Use and the Privacy Notice accepted at sign-up land on the
-- new account's profile, whether it signs up with a password or a provider.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- What Supabase Auth sends the hook before creating an account, and then creates.
create function pg_temp.create_account(id uuid, email text, provider text default 'email') returns jsonb
language plpgsql as $$
declare
  result jsonb;
begin
  result := private.hook_before_user_created(jsonb_build_object('user', jsonb_build_object(
    'id', id, 'email', email, 'app_metadata', jsonb_build_object('provider', provider))));
  if result = '{}'::jsonb then
    insert into auth.users (id, email) values (id, email);
  end if;
  return result;
end $$;

insert into public.invite_codes (code, kind, max_uses) values ('TRMS-2222', 'band', 3);

select is(
  public.claim_invite('TRMS-2222', 'ana@example.test', '2026-10-beta'), 'ok',
  'T-1202 a code is claimed with the terms accepted'
);
select is(
  (select terms_version from public.invite_claims where email = 'ana@example.test'), '2026-10-beta',
  'T-1202 the claim keeps which terms were accepted'
);
select is(
  pg_temp.create_account('00000000-0000-0000-0000-0000000004a1', 'ana@example.test'), '{}'::jsonb,
  'T-1202 the account is created'
);
select results_eq(
  $$select terms_version, terms_accepted_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000004a1'$$,
  $$values ('2026-10-beta', true)$$,
  'T-1202 the new profile records the terms accepted at sign-up, and when'
);

-- With a provider, the same: the claim comes first.
select public.claim_invite('TRMS-2222', 'ben@example.test', '2026-10-beta');
select pg_temp.create_account('00000000-0000-0000-0000-0000000004b1', 'ben@example.test', 'google');
select is(
  (select terms_version from public.profiles where id = '00000000-0000-0000-0000-0000000004b1'), '2026-10-beta',
  'T-1202 an account made with Google records the terms too'
);

-- A person cannot change what they accepted through the API.
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'terms_version', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'terms_accepted_at', 'UPDATE'),
  'T-1202 nobody rewrites the terms they accepted'
);

select * from finish();
rollback;
