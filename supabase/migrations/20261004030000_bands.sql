-- T-302: bands, members and their default instruments, and the personal space created with
-- every account (R-04.1, R-04.3, R-04.5, R-04.7, decision 2). Row-level security is on with
-- no policies yet (T-304). Rolled back by ../rollbacks/<same name>.

create type public.band_role as enum ('md', 'musician');

-- A band, or a person's personal space: a one-person band where they are the MD (R-04.7).
-- One personal space per person, deleted with their account.
create table public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  personal_owner_id uuid unique references public.profiles (id) on delete cascade,
  is_personal boolean generated always as (personal_owner_id is not null) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A person in a band, with a role in that band (R-04.5). Only one MD per band (decision 2).
create table public.band_members (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.band_role not null default 'musician',
  joined_at timestamptz not null default now(),
  unique (band_id, user_id)
);
create unique index band_members_one_md_per_band on public.band_members (band_id) where role = 'md';
create index band_members_user_id_idx on public.band_members (user_id);

-- A member's default instruments, from the catalog (R-04.3). An instrument in use is never
-- deleted, only deactivated (R-07.3).
create table public.member_instruments (
  member_id uuid not null references public.band_members (id) on delete cascade,
  instrument_id uuid not null references public.instruments (id) on delete restrict,
  primary key (member_id, instrument_id)
);
create index member_instruments_instrument_id_idx on public.member_instruments (instrument_id);

-- A personal space has one member, its owner, as MD: it accepts no invitations (R-04.7).
-- Runs with the owner's rights so a member's own view of bands can never hide the check.
create function public.personal_band_only_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select personal_owner_id into owner from public.bands where id = new.band_id;
  if owner is not null and (new.user_id <> owner or new.role <> 'md') then
    raise exception 'A personal space has only its owner, as MD' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger band_members_personal_band
  before insert or update on public.band_members
  for each row execute function public.personal_band_only_owner();

-- A band cannot become personal, or stop being personal, after it is created.
create function public.personal_owner_is_fixed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.personal_owner_id is distinct from old.personal_owner_id then
    raise exception 'A band cannot change whether it is a personal space' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger bands_personal_owner_fixed
  before update of personal_owner_id on public.bands
  for each row execute function public.personal_owner_is_fixed();

-- Every account gets its personal space when its profile is created (R-04.7). Runs with the
-- owner's rights because the tables are closed to users.
create function public.create_personal_space() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  band uuid;
begin
  insert into public.bands (name, personal_owner_id) values (new.name, new.id) returning id into band;
  insert into public.band_members (band_id, user_id, role) values (band, new.id, 'md');
  return new;
end;
$$;
create trigger profiles_personal_space
  after insert on public.profiles
  for each row execute function public.create_personal_space();

-- Trigger functions only: never callable through the API.
revoke execute on function public.personal_band_only_owner() from public, anon, authenticated;
revoke execute on function public.personal_owner_is_fixed() from public, anon, authenticated;
revoke execute on function public.create_personal_space() from public, anon, authenticated;

-- Profiles that exist before this migration get their personal space too.
with created as (
  insert into public.bands (name, personal_owner_id)
  select p.name, p.id from public.profiles p
  where not exists (select 1 from public.bands b where b.personal_owner_id = p.id)
  returning id, personal_owner_id
)
insert into public.band_members (band_id, user_id, role)
select id, personal_owner_id, 'md' from created;

alter table public.bands enable row level security;
alter table public.band_members enable row level security;
alter table public.member_instruments enable row level security;
