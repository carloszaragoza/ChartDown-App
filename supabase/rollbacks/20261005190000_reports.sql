-- Rolls back ../migrations/20261005190000_reports.sql. The event type 'version_hidden' stays:
-- Postgres cannot drop an enum value, and no event of it remains once its notices are gone.
delete from public.notifications where type = 'version_hidden';
delete from public.event_outbox where type::text = 'version_hidden';
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
  end if;

  update public.event_outbox set processed_at = now() where id = event.id;
  return null;
end;
$$;
drop trigger if exists reports_admin_log on public.reports;
drop trigger if exists versions_admin_log on public.versions;
drop function if exists private.on_report_admin();
drop function if exists private.on_version_status_admin();
drop function if exists public.dismiss_report(uuid);
drop function if exists public.show_version(uuid);
drop function if exists public.hide_version(uuid, public.report_reason);
drop table if exists public.reports;
drop type if exists public.report_status;
drop type if exists public.report_reason;
