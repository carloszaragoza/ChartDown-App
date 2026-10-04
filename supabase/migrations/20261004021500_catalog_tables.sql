-- T-301: profiles, instruments, songs, versions and revisions (Technical Plan 4, SPEC-02).
-- Row-level security is on for every table with no policies yet, so the API can neither read
-- nor write them until T-304 writes the policies. Rolled back by ../rollbacks/<same name>.

create type public.platform_role as enum ('user', 'admin');
create type public.interface_language as enum ('en', 'es');
create type public.visibility as enum ('public', 'private');
create type public.version_status as enum ('active', 'frozen', 'hidden');
create type public.source_type as enum ('studio', 'live', 'acoustic', 'own_arrangement');

-- A visitor has no session and no row (R-01.3). English by default (R-01.5).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  language public.interface_language not null default 'en',
  role public.platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The Admin's catalog (R-07.3). The slug is the instrument id charts use; aliases are the
-- other names a chart may use for it (ChartDown 0.4 section 4.1, R-00.1).
create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 40),
  name_es text not null check (char_length(btrim(name_es)) between 1 and 40),
  aliases text[] not null default '{}' check (array_position(aliases, null) is null),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The work: title and writers, no CCLI data (decision 10).
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  artists text[] not null default '{}' check (array_position(artists, null) is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A chart of a song. Public by default (R-02.3); the source type is required (R-02.2).
-- The owner becomes null when an account is deleted and author_name then reads "ChartDown"
-- (Technical Plan 12.5, T-405).
create table public.versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete restrict,
  owner_id uuid references public.profiles (id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 80),
  visibility public.visibility not null default 'public',
  status public.version_status not null default 'active',
  forked_from_id uuid references public.versions (id) on delete set null,
  current_revision_id uuid,
  source_type public.source_type not null,
  source_album text check (char_length(source_album) <= 200),
  source_year smallint check (source_year between 1800 and 2200),
  source_youtube_url text check (source_youtube_url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every save of a version (R-02.8). Numbers are unique per version; a restore points to the
-- revision it came from, in the same version.
create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versions (id) on delete cascade,
  number integer not null check (number >= 1),
  content text not null,
  author_id uuid references public.profiles (id) on delete set null,
  restored_from_id uuid,
  created_at timestamptz not null default now(),
  unique (version_id, number),
  unique (id, version_id),
  foreign key (restored_from_id, version_id) references public.revisions (id, version_id)
);

-- A version's current revision must be one of its own.
alter table public.versions
  add constraint versions_current_revision_fkey
  foreign key (current_revision_id, id) references public.revisions (id, version_id)
  deferrable initially deferred;

create index versions_song_id_idx on public.versions (song_id);
create index versions_owner_id_idx on public.versions (owner_id);
create index versions_forked_from_id_idx on public.versions (forked_from_id);

alter table public.profiles enable row level security;
alter table public.instruments enable row level security;
alter table public.songs enable row level security;
alter table public.versions enable row level security;
alter table public.revisions enable row level security;

-- The starting list of the Admin's catalog (R-07.3): ChartDown 0.4's standard roles, with
-- their accepted names, in English and Spanish. Kept equal to STANDARD_INSTRUMENTS in
-- @chartdown/core by packages/core/src/catalog-seed.test.ts.
insert into public.instruments (slug, name_en, name_es, aliases) values
  ('drums', 'Drums', 'Batería', '{drums,drum,perc}'),
  ('bass', 'Bass', 'Bajo', '{bass}'),
  ('keys', 'Keys', 'Teclados', '{keys,piano,pad,synth}'),
  ('guitar', 'Guitar', 'Guitarra', '{gtr,guitar,eg,ag}'),
  ('vocals', 'Vocals', 'Voces', '{vox,vocals,lead,bgv,bgvs}'),
  ('saxophone', 'Saxophone', 'Saxofón', '{sax,saxophone}'),
  ('trumpet', 'Trumpet', 'Trompeta', '{tpt,trumpet}'),
  ('trombone', 'Trombone', 'Trombón', '{tbn,trombone}'),
  ('violin', 'Violin', 'Violín', '{vln,violin}');
