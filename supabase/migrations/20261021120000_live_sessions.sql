-- T-1601, T-1602, T-1607: live mode, where the band follows the MD (SPEC-12, Technical Plan 4,
-- 7.1 and 8.1; the owner's approval, October 21, 2026). A session holds who leads a set and where
-- they are; the moves themselves travel over the session's private Realtime channel.
-- Rolled back by ../rollbacks/<same name>.

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null,
  band_id uuid not null,
  leader_id uuid not null references public.profiles (id) on delete cascade,
  -- Where the leader is: the song's place in the set, the section (from 0) and the cue.
  song_position integer not null default 1 check (song_position >= 1),
  section integer not null default 0 check (section >= 0),
  cue integer check (cue >= 0),
  started_at timestamptz not null default now(),
  leader_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (set_id, band_id) references public.sets (id, band_id) on delete cascade
);
-- One open session per set (R-12.1).
create unique index live_sessions_one_open on public.live_sessions (set_id) where ended_at is null;
create index live_sessions_band_id_idx on public.live_sessions (band_id);
create index live_sessions_leader_id_idx on public.live_sessions (leader_id);
alter table public.live_sessions enable row level security;

-- Who may join a set's session (R-12.12): the band's MD, the set's temporary MD and the set's
-- lineup. With a person given, for handing over; without, the person asking.
create function private.may_join_live(set_id uuid, person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select person is not null and (
    exists (
      select 1 from public.sets s join public.band_members m on m.band_id = s.band_id
      where s.id = may_join_live.set_id and m.user_id = person and m.role = 'md'
    ) or exists (
      select 1 from public.set_temp_md t join public.band_members m on m.id = t.member_id
      where t.set_id = may_join_live.set_id and m.user_id = person
        and (t.until is null or t.until >= current_date)
    ) or exists (
      select 1 from public.set_lineup l join public.band_members m on m.id = l.member_id
      where l.set_id = may_join_live.set_id and m.user_id = person
    )
  );
$$;

create function private.can_join_live(set_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.may_join_live(can_join_live.set_id, auth.uid());
$$;

-- Who may start a set's session: its band's MD or its temporary MD (R-12.1).
create function private.can_lead_live(set_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_md(private.band_of_set(can_lead_live.set_id)) or private.is_temp_md(can_lead_live.set_id);
$$;

-- The session a Realtime topic names ("live:<session id>"), or none.
create function private.live_topic_session(topic text) returns uuid
language sql immutable set search_path = '' as $$
  select case when topic ~ '^live:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substring(topic from 6)::uuid end;
$$;

-- On the channel: whoever may read the session listens and says they are there; only its open
-- session's leader broadcasts (R-12.12).
create function private.can_listen_live(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = private.live_topic_session(topic) and private.can_join_live(s.set_id)
  );
$$;

create function private.leads_live(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = private.live_topic_session(topic) and s.leader_id = auth.uid()
      and s.ended_at is null
  );
$$;

revoke all on function private.may_join_live(uuid, uuid) from public, anon;
revoke all on function private.can_join_live(uuid) from public, anon;
revoke all on function private.can_lead_live(uuid) from public, anon;
revoke all on function private.live_topic_session(text) from public, anon;
revoke all on function private.can_listen_live(text) from public, anon;
revoke all on function private.leads_live(text) from public, anon;
grant execute on function private.may_join_live(uuid, uuid) to authenticated;
grant execute on function private.can_join_live(uuid) to authenticated;
grant execute on function private.can_lead_live(uuid) to authenticated;
grant execute on function private.live_topic_session(text) to authenticated;
grant execute on function private.can_listen_live(text) to authenticated;
grant execute on function private.leads_live(text) to authenticated;

create policy "live_sessions: whoever may join reads" on public.live_sessions
  for select to authenticated using (private.can_join_live(set_id));
-- Written only through the functions below.
revoke all on public.live_sessions from anon;
revoke insert, update, delete, truncate on public.live_sessions from authenticated;

-- A notice to the set's lineup, the band's MD and the set's temporary MD, but the leader
-- (T-1607): live_started opens the session; live_ended says it ended.
create function private.notify_live(session public.live_sessions, kind text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  the_set public.sets;
  leader text;
  person uuid;
begin
  select * into the_set from public.sets s where s.id = session.set_id;
  select p.name into leader from public.profiles p where p.id = session.leader_id;
  for person in
    select distinct m.user_id from public.band_members m
    where m.band_id = session.band_id and m.user_id is distinct from auth.uid()
      and private.may_join_live(session.set_id, m.user_id)
  loop
    if private.wants_notice(person, kind) then
      insert into public.notifications (user_id, type, detail)
      values (person, kind, jsonb_build_object(
        'set_id', the_set.id, 'set_name', the_set.name, 'date', the_set.date, 'leader', leader
      ));
    end if;
  end loop;
end;
$$;
revoke all on function private.notify_live(public.live_sessions, text) from public, anon, authenticated;

-- Ends a set's sessions whose leader has not been heard for 5 minutes (R-12.10).
create function private.close_stale_live(set_id uuid) returns void
language sql volatile security definer set search_path = '' as $$
  update public.live_sessions s set ended_at = s.leader_seen_at + interval '5 minutes'
  where s.set_id = close_stale_live.set_id and s.ended_at is null
    and s.leader_seen_at <= now() - interval '5 minutes';
$$;
revoke all on function private.close_stale_live(uuid) from public, anon, authenticated;

-- Starts a set's session with the person asking as its leader (R-12.1), or picks up the one
-- they already lead. Another leader's open session stays: one leader per session.
create function public.live_start(set_id uuid) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  band uuid := private.band_of_set(live_start.set_id);
  session public.live_sessions;
begin
  if me is null or band is null or not private.can_lead_live(live_start.set_id) then
    raise exception 'not_md' using errcode = 'insufficient_privilege';
  end if;
  perform private.close_stale_live(live_start.set_id);
  select * into session from public.live_sessions s
  where s.set_id = live_start.set_id and s.ended_at is null;
  if session.id is not null then
    if session.leader_id = me then
      update public.live_sessions set leader_seen_at = now() where id = session.id;
      return session.id;
    end if;
    raise exception 'live_already' using errcode = 'unique_violation';
  end if;
  insert into public.live_sessions (set_id, band_id, leader_id)
  values (live_start.set_id, band, me) returning * into session;
  perform private.notify_live(session, 'live_started');
  return session.id;
end;
$$;

-- Where the leader is now: on every move, and every minute while still, which says the leader
-- is there (R-12.3, R-12.10).
create function public.live_move(session_id uuid, song_position integer, section integer,
                                 cue integer default null) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.live_sessions s
  set song_position = live_move.song_position, section = live_move.section, cue = live_move.cue,
      leader_seen_at = now()
  where s.id = live_move.session_id and s.leader_id = auth.uid() and s.ended_at is null;
  if not found then
    raise exception 'not_leader' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- The leader, or the band's MD, passes control to someone who may join (R-12.11).
create function public.live_hand_over(session_id uuid, to_person uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  session public.live_sessions;
begin
  select * into session from public.live_sessions s
  where s.id = live_hand_over.session_id and s.ended_at is null;
  if session.id is null or auth.uid() is null
     or not (session.leader_id = auth.uid() or private.is_md(session.band_id)) then
    raise exception 'not_leader' using errcode = 'insufficient_privilege';
  end if;
  if not private.may_join_live(session.set_id, to_person) then
    raise exception 'not_in_lineup' using errcode = 'check_violation';
  end if;
  update public.live_sessions set leader_id = to_person, leader_seen_at = now()
  where id = session.id;
end;
$$;

-- The leader, or the band's MD, ends the session; followers stay where they are (R-12.10).
create function public.live_end(session_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  session public.live_sessions;
begin
  select * into session from public.live_sessions s
  where s.id = live_end.session_id and s.ended_at is null;
  if session.id is null or auth.uid() is null
     or not (session.leader_id = auth.uid() or private.is_md(session.band_id)) then
    raise exception 'not_leader' using errcode = 'insufficient_privilege';
  end if;
  update public.live_sessions set ended_at = now() where id = session.id returning * into session;
  perform private.notify_live(session, 'live_ended');
end;
$$;

revoke all on function public.live_start(uuid) from public, anon;
revoke all on function public.live_move(uuid, integer, integer, integer) from public, anon;
revoke all on function public.live_hand_over(uuid, uuid) from public, anon;
revoke all on function public.live_end(uuid) from public, anon;
grant execute on function public.live_start(uuid) to authenticated;
grant execute on function public.live_move(uuid, integer, integer, integer) to authenticated;
grant execute on function public.live_hand_over(uuid, uuid) to authenticated;
grant execute on function public.live_end(uuid) to authenticated;

-- A session's changes reach the set's open pages (Technical Plan 7.1), with the read policy.
alter publication supabase_realtime add table public.live_sessions;

-- Realtime Authorization for the session's private channel, where Realtime runs.
do $$
begin
  if to_regclass('realtime.messages') is not null
     and to_regprocedure('realtime.topic()') is not null then
    execute $policy$
      create policy "live: whoever may join listens" on realtime.messages
        for select to authenticated
        using (extension in ('broadcast', 'presence') and private.can_listen_live((select realtime.topic())))
    $policy$;
    execute $policy$
      create policy "live: members say they are here; the leader broadcasts" on realtime.messages
        for insert to authenticated
        with check (
          (extension = 'presence' and private.can_listen_live((select realtime.topic())))
          or (extension = 'broadcast' and private.leads_live((select realtime.topic())))
        )
    $policy$;
  end if;
end $$;
