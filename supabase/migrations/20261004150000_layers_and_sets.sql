-- T-303: the MD layer and its notes; sets, their songs, lineup and temporary MD (SPEC-05,
-- SPEC-06, decisions 2, 8, 9, 9.1, 9.2, 9.3, 9.6). Rows that must share a band or a version
-- are tied by composite foreign keys. Row-level security is on with no policies yet (T-304).
-- Rolled back by ../rollbacks/<same name>.

create type public.set_type as enum ('rehearsal', 'service', 'concert');

-- Lets lineups and temporary MDs require a member of the set's band.
alter table public.band_members add constraint band_members_id_band_id_key unique (id, band_id);

-- One layer per band and version, reused in every set of the band (decision 9.1, R-06.6).
-- The band can hide the notes the author left in the version (decision 9.3).
create table public.layers (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  version_id uuid not null references public.versions (id) on delete restrict,
  hide_author_notes boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (band_id, version_id),
  unique (id, version_id)
);

-- A note anchored to a section by name and occurrence, and optionally a bar
-- (specs/chartdown-layers-0.5.md), and to a revision of the layer's version.
create table public.layer_notes (
  id uuid primary key default gen_random_uuid(),
  layer_id uuid not null,
  version_id uuid not null,
  section text not null check (char_length(btrim(section)) >= 1),
  occurrence integer not null default 1 check (occurrence >= 1),
  bar integer check (bar >= 1),
  text text not null check (char_length(btrim(text)) >= 1),
  anchored_revision_id uuid not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (layer_id, version_id) references public.layers (id, version_id) on delete cascade,
  foreign key (anchored_revision_id, version_id) references public.revisions (id, version_id)
);
create index layer_notes_layer_id_idx on public.layer_notes (layer_id);

-- Who a note is for. No rows: everyone; otherwise one or more instruments (R-06.2).
create table public.layer_note_instruments (
  note_id uuid not null references public.layer_notes (id) on delete cascade,
  instrument_id uuid not null references public.instruments (id) on delete restrict,
  primary key (note_id, instrument_id)
);
create index layer_note_instruments_instrument_id_idx on public.layer_note_instruments (instrument_id);

-- A set: a name unique within its band, ignoring case (decision 8, R-05.1), an optional date
-- and a type.
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  name text not null check (char_length(btrim(name)) >= 1),
  date date,
  type public.set_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, band_id)
);
create unique index sets_name_unique_in_band on public.sets (band_id, lower(btrim(name)));

-- A song in a set: its place, the version pinned to a revision of that version (decision 9.2),
-- and the key for this set (decision 9, R-05.4). No key: the version's own key.
create table public.set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets (id) on delete cascade,
  position integer not null check (position >= 1),
  version_id uuid not null references public.versions (id) on delete restrict,
  pinned_revision_id uuid not null,
  set_key text check (set_key ~ '^[A-G][b#]?m?$'),
  constraint set_items_position_key unique (set_id, position) deferrable initially immediate,
  foreign key (pinned_revision_id, version_id) references public.revisions (id, version_id)
);
create index set_items_version_id_idx on public.set_items (version_id);

-- Who plays what in a set: members of the set's band, one or more instruments each (R-05.3).
create table public.set_lineup (
  set_id uuid not null,
  band_id uuid not null,
  member_id uuid not null,
  instrument_id uuid not null references public.instruments (id) on delete restrict,
  primary key (set_id, member_id, instrument_id),
  foreign key (set_id, band_id) references public.sets (id, band_id) on delete cascade,
  foreign key (member_id, band_id) references public.band_members (id, band_id) on delete cascade
);
create index set_lineup_member_id_idx on public.set_lineup (member_id);
create index set_lineup_instrument_id_idx on public.set_lineup (instrument_id);

-- One temporary MD per set, a member of its band, until the set's date unless given
-- (decision 2, R-05.5). What they may change is decided by the policies (T-304, T-705).
create table public.set_temp_md (
  set_id uuid primary key,
  band_id uuid not null,
  member_id uuid not null,
  until date,
  foreign key (set_id, band_id) references public.sets (id, band_id) on delete cascade,
  foreign key (member_id, band_id) references public.band_members (id, band_id) on delete cascade
);
create index set_temp_md_member_id_idx on public.set_temp_md (member_id);

-- Runs with the owner's rights so the set's date is always found.
create function public.temp_md_until_set_date() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.until is null then
    select date into new.until from public.sets where id = new.set_id;
  end if;
  return new;
end;
$$;
create trigger set_temp_md_until
  before insert on public.set_temp_md
  for each row execute function public.temp_md_until_set_date();
revoke execute on function public.temp_md_until_set_date() from public, anon, authenticated;

alter table public.layers enable row level security;
alter table public.layer_notes enable row level security;
alter table public.layer_note_instruments enable row level security;
alter table public.sets enable row level security;
alter table public.set_items enable row level security;
alter table public.set_lineup enable row level security;
alter table public.set_temp_md enable row level security;
