-- T-1103: reports on public versions, and the Admin hiding a version and showing it again
-- (R-07.2, Technical Plan 4 and 8.1). Rolled back by ../rollbacks/<same name>.

alter type public.event_type add value 'version_hidden';
create type public.report_reason as enum ('lyrics', 'other');
create type public.report_status as enum ('open', 'hidden', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versions (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  note text check (char_length(note) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  check ((status = 'open') = (resolved_at is null))
);
-- One open report per person and version.
create unique index reports_one_open_idx on public.reports (version_id, reporter_id) where status = 'open';
create index reports_open_idx on public.reports (created_at) where status = 'open';

alter table public.reports enable row level security;
revoke update, delete on public.reports from anon, authenticated;
-- A signed-in person reports a version the community can read and they do not own (R-07.2).
create policy "reports: report a public version" on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid()) and status = 'open' and resolved_by is null and resolved_at is null
    and exists (
      select 1 from public.versions v
      where v.id = version_id and v.visibility = 'public' and v.status in ('active', 'frozen')
        and v.owner_id is distinct from (select auth.uid())
    )
  );
create policy "reports: admins read" on public.reports
  for select to authenticated using (private.is_admin());

-- Hides a public version from the community and closes its open reports; its owner is told why.
-- Only through here does a version become hidden (Technical Plan 8.1).
create function public.hide_version(version uuid, reason public.report_reason) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  found public.versions;
begin
  if not private.is_admin() then
    raise exception 'only admins hide versions' using errcode = '42501';
  end if;
  select * into found from public.versions v
  where v.id = version and v.visibility = 'public' and v.status in ('active', 'frozen')
  for update;
  if found.id is null then
    raise exception 'version_not_public' using errcode = 'P0002';
  end if;
  update public.versions set status = 'hidden', updated_at = now() where id = found.id;
  update public.reports set status = 'hidden', resolved_by = auth.uid(), resolved_at = now()
  where version_id = found.id and status = 'open';
  perform private.log_event('version_hidden', jsonb_build_object(
    'version_id', found.id,
    'title', (select s.title from public.songs s where s.id = found.song_id),
    'reason', reason
  ));
end;
$$;

-- Shows a hidden version again, as it was before it was hidden.
create function public.show_version(version uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  before text;
begin
  if not private.is_admin() then
    raise exception 'only admins show versions' using errcode = '42501';
  end if;
  if not exists (select 1 from public.versions v where v.id = version and v.status = 'hidden') then
    raise exception 'version_not_hidden' using errcode = 'P0002';
  end if;
  select l.detail -> 'status' ->> 'from' into before from public.admin_log l
  where l.action = 'version_hidden' and l.target_id = version::text
  order by l.id desc limit 1;
  update public.versions set status = coalesce(before, 'active')::public.version_status, updated_at = now()
  where id = version;
end;
$$;

-- Leaves a version as it is and closes one report.
create function public.dismiss_report(report uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'only admins dismiss reports' using errcode = '42501';
  end if;
  update public.reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
  where id = report and status = 'open';
  if not found then
    raise exception 'report_not_open' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.hide_version(uuid, public.report_reason), public.show_version(uuid),
  public.dismiss_report(uuid) from public, anon;
grant execute on function public.hide_version(uuid, public.report_reason), public.show_version(uuid),
  public.dismiss_report(uuid) to authenticated;

-- The Admin log (T-1101): hiding and showing a version, and dismissing a report.
create function private.on_version_status_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.status = 'hidden') <> (old.status = 'hidden') then
    perform private.log_admin(
      case when new.status = 'hidden' then 'version_hidden' else 'version_shown' end,
      'versions', new.id::text,
      jsonb_build_object('status', jsonb_build_object('from', old.status, 'to', new.status))
    );
  end if;
  return null;
end;
$$;
create trigger versions_admin_log after update of status on public.versions
  for each row execute function private.on_version_status_admin();

create function private.on_report_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'dismissed' and old.status = 'open' then
    perform private.log_admin('report_dismissed', 'reports', new.id::text,
      jsonb_build_object('version_id', new.version_id, 'reason', new.reason));
  end if;
  return null;
end;
$$;
create trigger reports_admin_log after update of status on public.reports
  for each row execute function private.on_report_admin();

revoke all on function private.on_version_status_admin(), private.on_report_admin() from public, anon, authenticated;

-- The owner's notice (T-1001).
create or replace function private.process_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  event public.event_outbox := new;
  the_set public.sets;
  title text;
  person uuid;
  note public.layer_notes;
  slugs jsonb;
  item record;
begin
  if event.type in ('set_lineup_added', 'set_lineup_removed', 'set_temp_md_appointed',
                    'set_key_changed', 'set_order_changed') then
    select * into the_set from public.sets s where s.id = (event.detail ->> 'set_id')::uuid;
    -- A set deleted in the same change (its lineup goes with it) says nothing.
    if the_set.id is null then
      update public.event_outbox set processed_at = now() where id = event.id;
      return null;
    end if;
  end if;

  if event.type in ('set_lineup_added', 'set_lineup_removed') then
    -- R-09.1: the musician, with the set's name, date and time and the instrument.
    perform private.notify(
      (event.detail ->> 'user_id')::uuid,
      case event.type when 'set_lineup_added' then 'lineup_added' else 'lineup_removed' end,
      jsonb_build_object(
        'set_id', the_set.id, 'set_name', the_set.name, 'date', the_set.date, 'time', the_set.time,
        'instrument', (select i.slug from public.instruments i where i.id = (event.detail ->> 'instrument_id')::uuid)
      ),
      event
    );

  elsif event.type = 'set_temp_md_appointed' then
    perform private.notify(
      (event.detail ->> 'user_id')::uuid, 'temp_md',
      jsonb_build_object('set_id', the_set.id, 'set_name', the_set.name, 'date', the_set.date,
                         'until', event.detail ->> 'until'),
      event
    );

  elsif event.type in ('set_key_changed', 'set_order_changed') then
    -- R-09.2: the set's members; the order once per change, however many songs moved.
    select s.title into title from public.versions v join public.songs s on s.id = v.song_id
    where v.id = (event.detail ->> 'version_id')::uuid;
    for person in select m.user_id from public.band_members m where m.band_id = the_set.band_id loop
      if event.type = 'set_key_changed' then
        perform private.notify(person, 'key_changed', jsonb_build_object(
          'set_id', the_set.id, 'set_name', the_set.name, 'version_id', event.detail ->> 'version_id',
          'title', title, 'old_key', event.detail ->> 'old_key', 'new_key', event.detail ->> 'new_key'
        ), event);
      elsif not exists (
        select 1 from public.notifications n
        where n.user_id = person and n.type = 'order_changed'
          and n.detail ->> 'set_id' = the_set.id::text and n.created_at = event.created_at
      ) then
        perform private.notify(person, 'order_changed',
          jsonb_build_object('set_id', the_set.id, 'set_name', the_set.name), event);
      end if;
    end loop;

  elsif event.type = 'layer_note_added' then
    -- R-09.2: whoever plays the note's instruments in the band, or everyone in it.
    select * into note from public.layer_notes n where n.id = (event.detail ->> 'note_id')::uuid;
    if note.id is not null then
      select s.title into title from public.versions v join public.songs s on s.id = v.song_id
      where v.id = note.version_id;
      select coalesce(jsonb_agg(i.slug order by i.slug), '[]'::jsonb) into slugs
      from public.layer_note_instruments ni join public.instruments i on i.id = ni.instrument_id
      where ni.note_id = note.id;
      for person in
        select m.user_id from public.band_members m
        where m.band_id = (event.detail ->> 'band_id')::uuid and (
          jsonb_array_length(slugs) = 0
          or exists (
            select 1 from public.member_instruments mi join public.layer_note_instruments ni on ni.instrument_id = mi.instrument_id
            where mi.member_id = m.id and ni.note_id = note.id
          )
          or exists (
            select 1 from public.set_lineup l join public.layer_note_instruments ni on ni.instrument_id = l.instrument_id
            where l.member_id = m.id and ni.note_id = note.id
          )
        )
      loop
        perform private.notify(person, 'note_added', jsonb_build_object(
          'version_id', note.version_id, 'band_id', event.detail ->> 'band_id',
          'band_name', (select b.name from public.bands b where b.id = (event.detail ->> 'band_id')::uuid),
          'title', title, 'section', note.section, 'occurrence', note.occurrence, 'bar', note.bar,
          'text', note.text, 'instruments', slugs
        ), event);
      end loop;
    end if;

  elsif event.type = 'revision_added' then
    -- R-09.4: the MD of each band whose sets use the version, with what each set still plays.
    select s.title into title from public.versions v join public.songs s on s.id = v.song_id
    where v.id = (event.detail ->> 'version_id')::uuid;
    for item in
      select st.id as set_id, st.name as set_name, r.number as pinned, m.user_id as md
      from public.set_items i
      join public.sets st on st.id = i.set_id
      join public.revisions r on r.id = i.pinned_revision_id
      join public.band_members m on m.band_id = st.band_id and m.role = 'md'
      where i.version_id = (event.detail ->> 'version_id')::uuid
        and i.pinned_revision_id <> (event.detail ->> 'revision_id')::uuid
    loop
      perform private.notify(item.md, 'new_revision', jsonb_build_object(
        'set_id', item.set_id, 'set_name', item.set_name, 'version_id', event.detail ->> 'version_id',
        'title', title, 'number', (event.detail ->> 'number')::int, 'pinned_number', item.pinned
      ), event);
    end loop;

  elsif event.type = 'version_hidden' then
    -- R-07.2: the owner of a version the administrators hid, with why (T-1103).
    perform private.notify(
      (select v.owner_id from public.versions v where v.id = (event.detail ->> 'version_id')::uuid),
      'version_hidden',
      jsonb_build_object('version_id', event.detail ->> 'version_id', 'title', event.detail ->> 'title',
                         'reason', event.detail ->> 'reason'),
      event
    );
  end if;

  update public.event_outbox set processed_at = now() where id = event.id;
  return null;
end;
$$;
