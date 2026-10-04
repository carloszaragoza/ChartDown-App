-- T-403: the instruments a person plays (R-01.2), from the Admin's catalog.
-- Rolled back by ../rollbacks/<same name>.

create table public.user_instruments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  instrument_id uuid not null references public.instruments (id) on delete restrict,
  primary key (user_id, instrument_id)
);
create index user_instruments_instrument_id_idx on public.user_instruments (instrument_id);

-- A deactivated instrument is not offered for new choices, but stays where it already is (R-07.3).
create function private.instrument_is_active() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.instruments where id = new.instrument_id and active) then
    raise exception 'This instrument is no longer offered' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function private.instrument_is_active() from public, anon, authenticated;
create trigger user_instruments_active
  before insert on public.user_instruments
  for each row execute function private.instrument_is_active();

alter table public.user_instruments enable row level security;

-- Each person manages their own (Technical Plan 8.1).
create policy "user_instruments: read your own" on public.user_instruments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_instruments: add your own" on public.user_instruments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_instruments: remove your own" on public.user_instruments
  for delete to authenticated using (user_id = (select auth.uid()));
