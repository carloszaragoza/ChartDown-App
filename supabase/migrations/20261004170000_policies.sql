-- T-304: row-level security policies for every table (Technical Plan 8.1, the permission
-- matrix of SDD Plan 4, R-06.4). Rolled back by ../rollbacks/<same name>.

-- Helpers. The private schema is not exposed by the API. Each function runs with the owner's
-- rights (so policies never recurse) and always checks the person asking: auth.uid().
create schema private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function private.is_member(band uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.band_members where band_id = band and user_id = auth.uid());
$$;

create function private.is_md(band uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.band_members where band_id = band and user_id = auth.uid() and role = 'md'
  );
$$;

-- A temporary MD's role ends with the set's date (UTC), or when the MD removes it (R-05.5).
create function private.is_temp_md(set_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.set_temp_md t
    join public.band_members m on m.id = t.member_id
    where t.set_id = is_temp_md.set_id and m.user_id = auth.uid()
      and (t.until is null or t.until >= current_date)
  );
$$;

-- A temporary MD sees every note of the versions in their set (R-06.3).
create function private.is_temp_md_for_version(band uuid, version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.set_temp_md t
    join public.band_members m on m.id = t.member_id
    join public.set_items i on i.set_id = t.set_id
    where t.band_id = band and m.user_id = auth.uid() and i.version_id = version
      and (t.until is null or t.until >= current_date)
  );
$$;

-- The instruments a person plays in a band: their default instruments and any instrument in
-- the band's set lineups (Technical Plan 8.1). The server function narrows it to one set.
create function private.plays(band uuid, instrument uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_instruments mi
    join public.band_members m on m.id = mi.member_id
    where m.band_id = band and m.user_id = auth.uid() and mi.instrument_id = instrument
  ) or exists (
    select 1 from public.set_lineup l
    join public.band_members m on m.id = l.member_id
    where l.band_id = band and m.user_id = auth.uid() and l.instrument_id = instrument
  );
$$;

create function private.shares_band(person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.band_members mine
    join public.band_members theirs on theirs.band_id = mine.band_id
    where mine.user_id = auth.uid() and theirs.user_id = person
  );
$$;

-- Public active or frozen: everyone (R-01.4). Hidden: owner and admins (R-07.2). Private:
-- owner, admins and members of bands that use it in a set or a layer (decision 9).
create function private.can_read_version(version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.versions v
    where v.id = version and (
      (v.visibility = 'public' and v.status in ('active', 'frozen'))
      or v.owner_id = auth.uid()
      or private.is_admin()
      or (v.status <> 'hidden' and (
        exists (select 1 from public.set_items i join public.sets s on s.id = i.set_id
                where i.version_id = v.id and private.is_member(s.band_id))
        or exists (select 1 from public.layers l where l.version_id = v.id and private.is_member(l.band_id))
      ))
    )
  );
$$;

create function private.owns_version(version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.versions where id = version and owner_id = auth.uid());
$$;

-- Layer notes (R-06.2, R-06.4): the MD reads all; a temporary MD all of their set's versions;
-- a musician notes for everyone and for an instrument they play; nobody outside the band.
create function private.can_read_note(note uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.layer_notes n
    join public.layers l on l.id = n.layer_id
    where n.id = note and (
      private.is_md(l.band_id)
      or private.is_temp_md_for_version(l.band_id, n.version_id)
      or (private.is_member(l.band_id) and (
        not exists (select 1 from public.layer_note_instruments i where i.note_id = n.id)
        or exists (select 1 from public.layer_note_instruments i
                   where i.note_id = n.id and private.plays(l.band_id, i.instrument_id))
      ))
    )
  );
$$;

create function private.band_of_member(member uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select band_id from public.band_members where id = member;
$$;

create function private.band_of_layer(layer uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select band_id from public.layers where id = layer;
$$;

create function private.band_of_note(note uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select l.band_id from public.layer_notes n join public.layers l on l.id = n.layer_id where n.id = note;
$$;

create function private.band_of_set(set_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select band_id from public.sets where id = set_id;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated;

-- Column limits: what a policy cannot express. Nobody changes their own platform role; a
-- version's visibility, status and owner change only through their flows; revisions and
-- versions are never edited or deleted through the API where the rules say so.
revoke update on public.profiles, public.instruments, public.songs, public.versions, public.bands,
  public.layers, public.layer_notes, public.sets, public.set_items, public.set_temp_md
  from anon, authenticated;
grant update (name, language, updated_at) on public.profiles to authenticated;
grant update (slug, name_en, name_es, aliases, active) on public.instruments to authenticated;
grant update (title, artists, updated_at) on public.songs to authenticated;
grant update (current_revision_id, source_type, source_album, source_year, source_youtube_url, updated_at)
  on public.versions to authenticated;
grant update (name, updated_at) on public.bands to authenticated;
grant update (hide_author_notes, updated_at) on public.layers to authenticated;
grant update (section, occurrence, bar, text, anchored_revision_id, updated_at) on public.layer_notes to authenticated;
grant update (name, date, type, updated_at) on public.sets to authenticated;
grant update (position, set_key, pinned_revision_id) on public.set_items to authenticated;
grant update (member_id, until) on public.set_temp_md to authenticated;
revoke update, delete on public.revisions from anon, authenticated;
revoke delete on public.versions from anon, authenticated;

-- profiles
create policy "profiles: read yourself, bandmates; admins all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_band(id) or private.is_admin());
create policy "profiles: create your own, as a user" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()) and role = 'user');
create policy "profiles: edit your own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- instruments
create policy "instruments: everyone reads the catalog" on public.instruments
  for select to anon, authenticated using (true);
create policy "instruments: admins add" on public.instruments
  for insert to authenticated with check (private.is_admin());
create policy "instruments: admins edit" on public.instruments
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "instruments: admins delete" on public.instruments
  for delete to authenticated using (private.is_admin());

-- songs
create policy "songs: everyone reads" on public.songs
  for select to anon, authenticated using (true);
create policy "songs: users create" on public.songs
  for insert to authenticated with check (true);
create policy "songs: admins edit" on public.songs
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- versions
create policy "versions: read what you may" on public.versions
  for select to anon, authenticated using (private.can_read_version(id));
create policy "versions: create as yourself, public and active" on public.versions
  for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and visibility = 'public' and status = 'active'
    and (forked_from_id is null or private.can_read_version(forked_from_id))
  );
create policy "versions: the owner edits" on public.versions
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- revisions
create policy "revisions: read with the version" on public.revisions
  for select to anon, authenticated using (private.can_read_version(version_id));
create policy "revisions: the owner adds, as themselves" on public.revisions
  for insert to authenticated
  with check (author_id = (select auth.uid()) and private.owns_version(version_id));

-- bands and members
create policy "bands: members read" on public.bands
  for select to authenticated using (private.is_member(id));
create policy "bands: the MD renames" on public.bands
  for update to authenticated using (private.is_md(id)) with check (private.is_md(id));

create policy "band_members: members read" on public.band_members
  for select to authenticated using (private.is_member(band_id));
create policy "band_members: the MD removes musicians, a musician leaves" on public.band_members
  for delete to authenticated
  using (role = 'musician' and (private.is_md(band_id) or user_id = (select auth.uid())));

create policy "member_instruments: members read" on public.member_instruments
  for select to authenticated using (private.is_member(private.band_of_member(member_id)));
create policy "member_instruments: the MD assigns" on public.member_instruments
  for insert to authenticated with check (private.is_md(private.band_of_member(member_id)));
create policy "member_instruments: the MD removes" on public.member_instruments
  for delete to authenticated using (private.is_md(private.band_of_member(member_id)));

-- layers and notes: the permanent MD writes (R-03.5, decision 9.6)
create policy "layers: members read" on public.layers
  for select to authenticated using (private.is_member(band_id));
create policy "layers: the MD creates" on public.layers
  for insert to authenticated
  with check (private.is_md(band_id) and private.can_read_version(version_id));
create policy "layers: the MD edits" on public.layers
  for update to authenticated using (private.is_md(band_id)) with check (private.is_md(band_id));
create policy "layers: the MD deletes" on public.layers
  for delete to authenticated using (private.is_md(band_id));

create policy "layer_notes: read your notes" on public.layer_notes
  for select to authenticated using (private.can_read_note(id));
create policy "layer_notes: the MD writes" on public.layer_notes
  for insert to authenticated
  with check (private.is_md(private.band_of_layer(layer_id)) and created_by = (select auth.uid()));
create policy "layer_notes: the MD edits" on public.layer_notes
  for update to authenticated
  using (private.is_md(private.band_of_layer(layer_id))) with check (private.is_md(private.band_of_layer(layer_id)));
create policy "layer_notes: the MD deletes" on public.layer_notes
  for delete to authenticated using (private.is_md(private.band_of_layer(layer_id)));

create policy "layer_note_instruments: read with the note" on public.layer_note_instruments
  for select to authenticated using (private.can_read_note(note_id));
create policy "layer_note_instruments: the MD assigns" on public.layer_note_instruments
  for insert to authenticated with check (private.is_md(private.band_of_note(note_id)));
create policy "layer_note_instruments: the MD removes" on public.layer_note_instruments
  for delete to authenticated using (private.is_md(private.band_of_note(note_id)));

-- sets: the MD, everything; a temporary MD, their set's order, keys and lineup (R-05.5)
create policy "sets: members read" on public.sets
  for select to authenticated using (private.is_member(band_id));
create policy "sets: the MD creates" on public.sets
  for insert to authenticated with check (private.is_md(band_id));
create policy "sets: the MD edits" on public.sets
  for update to authenticated using (private.is_md(band_id)) with check (private.is_md(band_id));
create policy "sets: the MD deletes" on public.sets
  for delete to authenticated using (private.is_md(band_id));

create policy "set_items: members read" on public.set_items
  for select to authenticated using (private.is_member(private.band_of_set(set_id)));
create policy "set_items: the MD adds songs" on public.set_items
  for insert to authenticated
  with check (private.is_md(private.band_of_set(set_id)) and private.can_read_version(version_id));
create policy "set_items: the MD or the set's temporary MD edits" on public.set_items
  for update to authenticated
  using (private.is_md(private.band_of_set(set_id)) or private.is_temp_md(set_id))
  with check (private.is_md(private.band_of_set(set_id)) or private.is_temp_md(set_id));
create policy "set_items: the MD removes songs" on public.set_items
  for delete to authenticated using (private.is_md(private.band_of_set(set_id)));

create policy "set_lineup: members read" on public.set_lineup
  for select to authenticated using (private.is_member(band_id));
create policy "set_lineup: the MD or the set's temporary MD adds" on public.set_lineup
  for insert to authenticated with check (private.is_md(band_id) or private.is_temp_md(set_id));
create policy "set_lineup: the MD or the set's temporary MD removes" on public.set_lineup
  for delete to authenticated using (private.is_md(band_id) or private.is_temp_md(set_id));

create policy "set_temp_md: members read" on public.set_temp_md
  for select to authenticated using (private.is_member(band_id));
create policy "set_temp_md: the MD appoints" on public.set_temp_md
  for insert to authenticated with check (private.is_md(band_id));
create policy "set_temp_md: the MD changes" on public.set_temp_md
  for update to authenticated using (private.is_md(band_id)) with check (private.is_md(band_id));
create policy "set_temp_md: the MD removes" on public.set_temp_md
  for delete to authenticated using (private.is_md(band_id));

-- Only the MD moves a song to another revision (decision 9.2), never a temporary MD.
create function private.only_md_changes_pinned_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.pinned_revision_id is distinct from old.pinned_revision_id
     and auth.uid() is not null
     and not private.is_md(private.band_of_set(new.set_id)) then
    raise exception 'Only the MD updates a song to another revision' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke all on function private.only_md_changes_pinned_revision() from public, anon, authenticated;
create trigger set_items_only_md_changes_pinned_revision
  before update of pinned_revision_id on public.set_items
  for each row execute function private.only_md_changes_pinned_revision();
