-- T-305: the event log, notices and notice preferences (SPEC-09, Technical Plan 7).
-- Every important change writes an event from a database trigger, so no path can skip it.
-- Rolled back by ../rollbacks/<same name>.

create type public.event_type as enum (
  'set_lineup_added', 'set_lineup_removed', 'set_temp_md_appointed',
  'set_key_changed', 'set_order_changed', 'layer_note_added', 'revision_added'
);
create type public.notice_channel as enum ('in_app', 'email', 'whatsapp');

-- Facts with what changed. Written only by the triggers below; read by the server process
-- that turns them into notices (T-1001). Closed to the API.
create table public.event_outbox (
  id bigint generated always as identity primary key,
  type public.event_type not null,
  actor_id uuid references public.profiles (id) on delete set null,
  detail jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index event_outbox_unprocessed_idx on public.event_outbox (id) where processed_at is null;

-- A person's notices (R-09.3). Created only by the server process.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z_]*$'),
  detail jsonb not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

-- Which notices a person receives on which channel (R-09.5). No row: the notice is on.
create table public.notification_prefs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z_]*$'),
  channel public.notice_channel not null,
  active boolean not null,
  primary key (user_id, type, channel)
);

-- Writes one event. Runs with the owner's rights because the log is closed to users.
create function private.log_event(kind public.event_type, detail jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.event_outbox (type, actor_id, detail)
  values (kind, (select id from public.profiles where id = auth.uid()), detail);
$$;

create function private.on_set_lineup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  item public.set_lineup := case when tg_op = 'DELETE' then old else new end;
begin
  perform private.log_event(
    case when tg_op = 'DELETE' then 'set_lineup_removed' else 'set_lineup_added' end::public.event_type,
    jsonb_build_object(
      'set_id', item.set_id, 'band_id', item.band_id, 'member_id', item.member_id,
      'user_id', (select user_id from public.band_members where id = item.member_id),
      'instrument_id', item.instrument_id
    )
  );
  return null;
end;
$$;
create trigger set_lineup_events after insert or delete on public.set_lineup
  for each row execute function private.on_set_lineup();

create function private.on_set_temp_md() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.log_event('set_temp_md_appointed', jsonb_build_object(
    'set_id', new.set_id, 'band_id', new.band_id, 'member_id', new.member_id,
    'user_id', (select user_id from public.band_members where id = new.member_id),
    'until', new.until
  ));
  return null;
end;
$$;
create trigger set_temp_md_events after insert on public.set_temp_md
  for each row execute function private.on_set_temp_md();

create function private.on_set_item_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.set_key is distinct from old.set_key then
    perform private.log_event('set_key_changed', jsonb_build_object(
      'set_id', new.set_id, 'version_id', new.version_id, 'old_key', old.set_key, 'new_key', new.set_key
    ));
  end if;
  if new.position is distinct from old.position then
    perform private.log_event('set_order_changed', jsonb_build_object(
      'set_id', new.set_id, 'version_id', new.version_id, 'old_position', old.position, 'new_position', new.position
    ));
  end if;
  return null;
end;
$$;
create trigger set_items_events after update of set_key, position on public.set_items
  for each row execute function private.on_set_item_change();

-- At the end of the transaction, so the note's instruments are saved too.
create function private.on_layer_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.layer_notes where id = new.id) then
    return null;
  end if;
  perform private.log_event('layer_note_added', jsonb_build_object(
    'note_id', new.id, 'layer_id', new.layer_id, 'version_id', new.version_id,
    'band_id', (select band_id from public.layers where id = new.layer_id),
    'section', new.section, 'occurrence', new.occurrence, 'bar', new.bar,
    'instrument_ids', coalesce(
      (select jsonb_agg(instrument_id order by instrument_id) from public.layer_note_instruments where note_id = new.id),
      '[]'::jsonb
    )
  ));
  return null;
end;
$$;
create constraint trigger layer_notes_events after insert on public.layer_notes
  deferrable initially deferred
  for each row execute function private.on_layer_note();

create function private.on_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.log_event('revision_added', jsonb_build_object(
    'revision_id', new.id, 'version_id', new.version_id, 'number', new.number, 'author_id', new.author_id
  ));
  return null;
end;
$$;
create trigger revisions_events after insert on public.revisions
  for each row execute function private.on_revision();

revoke all on function private.log_event(public.event_type, jsonb), private.on_set_lineup(),
  private.on_set_temp_md(), private.on_set_item_change(), private.on_layer_note(), private.on_revision()
  from public, anon, authenticated;

alter table public.event_outbox enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_prefs enable row level security;

-- Policies (Technical Plan 8.1).
create policy "event_outbox: nobody through the API" on public.event_outbox
  for all to anon, authenticated using (false) with check (false);

revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "notifications: read your own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark your own read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "notification_prefs: read your own" on public.notification_prefs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notification_prefs: add your own" on public.notification_prefs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notification_prefs: change your own" on public.notification_prefs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notification_prefs: remove your own" on public.notification_prefs
  for delete to authenticated using (user_id = (select auth.uid()));
