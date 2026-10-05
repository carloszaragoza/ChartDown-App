-- T-1101: every Admin action is logged, by database triggers on what the Admin changes, so no
-- path can skip it (Technical Plan 8). Rolled back by ../rollbacks/<same name>.

create table public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z_]*$'),
  target_table text not null,
  target_id text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_log_created_at_idx on public.admin_log (created_at desc);

alter table public.admin_log enable row level security;
revoke insert, update, delete on public.admin_log from anon, authenticated;
create policy "admin_log: admins read" on public.admin_log
  for select to authenticated using (private.is_admin());

-- One line of the log, when the person making the change is an admin. Changes made by the
-- database itself (migrations, the sign-up hook counting a code's uses) are not Admin actions.
create function private.log_admin(action text, target_table text, target_id text, detail jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.admin_log (admin_id, action, target_table, target_id, detail)
  select auth.uid(), action, target_table, target_id, detail
  where private.is_admin();
$$;

-- The instrument catalog (R-07.3): what was added, and each change with its old and new value.
create function private.on_instrument_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changed jsonb := '{}';
  field text;
begin
  if tg_op = 'INSERT' then
    perform private.log_admin('instrument_added', 'instruments', new.id::text,
      jsonb_build_object('slug', new.slug, 'name_en', new.name_en, 'name_es', new.name_es, 'aliases', to_jsonb(new.aliases)));
  elsif tg_op = 'DELETE' then
    perform private.log_admin('instrument_deleted', 'instruments', old.id::text, jsonb_build_object('slug', old.slug));
  else
    foreach field in array array['slug', 'name_en', 'name_es', 'aliases', 'active'] loop
      if to_jsonb(new) -> field is distinct from to_jsonb(old) -> field then
        changed := changed || jsonb_build_object(field, jsonb_build_object('from', to_jsonb(old) -> field, 'to', to_jsonb(new) -> field));
      end if;
    end loop;
    if changed <> '{}' then
      perform private.log_admin(
        case
          when new.active is distinct from old.active and not new.active then 'instrument_deactivated'
          when new.active is distinct from old.active then 'instrument_reactivated'
          else 'instrument_changed'
        end,
        'instruments', new.id::text, changed || jsonb_build_object('slug', new.slug));
    end if;
  end if;
  return null;
end;
$$;
create trigger instruments_admin_log after insert or update or delete on public.instruments
  for each row execute function private.on_instrument_admin();

-- Invite codes (R-01.7): created and revoked.
create function private.on_invite_code_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_admin('invite_created', 'invite_codes', new.id::text,
      jsonb_build_object('code', new.code, 'kind', new.kind, 'max_uses', new.max_uses, 'note', new.note));
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform private.log_admin('invite_revoked', 'invite_codes', new.id::text, jsonb_build_object('code', new.code));
  elsif new.note is distinct from old.note then
    perform private.log_admin('invite_changed', 'invite_codes', new.id::text,
      jsonb_build_object('code', new.code, 'note', jsonb_build_object('from', old.note, 'to', new.note)));
  end if;
  return null;
end;
$$;
create trigger invite_codes_admin_log after insert or update on public.invite_codes
  for each row execute function private.on_invite_code_admin();

revoke all on function private.log_admin(text, text, text, jsonb), private.on_instrument_admin(),
  private.on_invite_code_admin() from public, anon, authenticated;
