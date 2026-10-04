-- T-402: invite codes, claims, the sign-up hook and the waitlist (R-01.7, R-01.8,
-- Technical Plan 12.1). Rolled back by ../rollbacks/<same name>.

create type public.invite_kind as enum ('single_use', 'band');

-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I), as XXXX-XXXX, from secure
-- random bytes: 256 is a multiple of 32, so every character is equally likely.
create function private.new_invite_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', get_byte(bytes, i) % 32 + 1, 1)
           || case when i = 3 then '-' else '' end, '' order by i)
  from (select extensions.gen_random_bytes(8) as bytes) random, generate_series(0, 7) as i;
$$;
grant usage on schema private to service_role;
grant execute on function private.new_invite_code() to authenticated, service_role;

-- Codes the Admin creates and revokes (R-01.7). Single use, or a band code with an optional
-- limit. No expiry: the Admin revokes.
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default private.new_invite_code()
    check (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  kind public.invite_kind not null default 'single_use',
  max_uses integer default 1 check (max_uses >= 1),
  uses integer not null default 0 check (uses >= 0),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (kind <> 'single_use' or max_uses = 1),
  check (max_uses is null or uses <= max_uses)
);

-- A code claimed for an email, for 30 minutes, before the account exists. The account's id is
-- kept when it is created (no foreign key: the hook runs before the account exists).
create table public.invite_claims (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.invite_codes (id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  used_at timestamptz,
  user_id uuid
);
create index invite_claims_open_idx on public.invite_claims (email) where used_at is null;

-- People waiting for a code (R-01.8).
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  language public.interface_language not null default 'en',
  created_at timestamptz not null default now()
);

-- Step 1 of creating an account: an invite code and the email it is for. Answers only "ok" or
-- "invalid", so nothing else about codes can be learned from it.
create function public.claim_invite(code text, email text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  typed text := upper(regexp_replace(coalesce(claim_invite.code, ''), '[^A-Za-z0-9]', '', 'g'));
  address text := lower(btrim(coalesce(claim_invite.email, '')));
  found uuid;
begin
  if char_length(typed) <> 8 or address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid';
  end if;
  select c.id into found from public.invite_codes c
  where c.code = left(typed, 4) || '-' || right(typed, 4)
    and c.revoked_at is null and (c.max_uses is null or c.uses < c.max_uses);
  if found is null then
    return 'invalid';
  end if;
  insert into public.invite_claims (code_id, email) values (found, address);
  return 'ok';
end;
$$;
revoke all on function public.claim_invite(text, text) from public;
grant execute on function public.claim_invite(text, text) to anon, authenticated;

-- Joining the waitlist answers the same whether or not the email is already on it.
create function public.join_waitlist(email text, language text default 'en') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  address text := lower(btrim(coalesce(join_waitlist.email, '')));
begin
  if address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Not an email address' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.waitlist (email, language)
  values (address, case when join_waitlist.language = 'es' then 'es' else 'en' end::public.interface_language)
  on conflict (email) do nothing;
end;
$$;
revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;

-- Supabase Auth's "before user created" hook: a new account, by any sign-in method, needs an
-- open claim for its email on a code that still has uses (R-01.7). It uses up the code.
create function private.hook_before_user_created(event jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  address text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  claim_id uuid;
  claimed_code uuid;
begin
  select cl.id, cl.code_id into claim_id, claimed_code
  from public.invite_claims cl
  join public.invite_codes c on c.id = cl.code_id
  where cl.email = address and cl.used_at is null and cl.expires_at > now()
    and c.revoked_at is null and (c.max_uses is null or c.uses < c.max_uses)
  order by cl.created_at desc
  limit 1
  for update of c;
  if claim_id is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'invite_required'));
  end if;
  update public.invite_codes set uses = uses + 1 where id = claimed_code;
  update public.invite_claims set used_at = now(), user_id = (event -> 'user' ->> 'id')::uuid where id = claim_id;
  return '{}'::jsonb;
end;
$$;
revoke all on function private.hook_before_user_created(jsonb) from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.hook_before_user_created(jsonb) to supabase_auth_admin;

alter table public.invite_codes enable row level security;
alter table public.invite_claims enable row level security;
alter table public.waitlist enable row level security;

-- Policies (Technical Plan 8.1): codes and the waitlist are the Admin's; claims, nobody's.
revoke update on public.invite_codes from anon, authenticated;
grant update (note, revoked_at) on public.invite_codes to authenticated;
create policy "invite_codes: admins read" on public.invite_codes
  for select to authenticated using (private.is_admin());
create policy "invite_codes: admins create" on public.invite_codes
  for insert to authenticated with check (private.is_admin() and uses = 0 and revoked_at is null);
create policy "invite_codes: admins revoke" on public.invite_codes
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "invite_claims: nobody through the API" on public.invite_claims
  for all to anon, authenticated using (false) with check (false);

create policy "waitlist: admins read" on public.waitlist
  for select to authenticated using (private.is_admin());
