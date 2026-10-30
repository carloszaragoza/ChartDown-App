-- T-3037: live sync (SPEC-14, R-14.12; the owner's approval, October 30, 2026). Every device
-- allowed in an open session sends on its channel: its clock exchanges and, later, its
-- introductions for a direct link. The app still takes moves from the leader only.
-- Rolled back by ../rollbacks/<same name>.

-- Whoever may join a session that is still open sends on its channel.
create function private.may_send_live(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = private.live_topic_session(topic) and s.ended_at is null
      and private.can_join_live(s.set_id)
  );
$$;
revoke all on function private.may_send_live(text) from public, anon;
grant execute on function private.may_send_live(text) to authenticated;

-- Realtime Authorization, where Realtime runs: the members of an open session broadcast.
do $$
begin
  if to_regclass('realtime.messages') is not null
     and to_regprocedure('realtime.topic()') is not null then
    execute 'drop policy if exists "live: members say they are here; the leader broadcasts" on realtime.messages';
    execute $policy$
      create policy "live: members say they are here and keep the clock" on realtime.messages
        for insert to authenticated
        with check (
          (extension = 'presence' and private.can_listen_live((select realtime.topic())))
          or (extension = 'broadcast' and private.may_send_live((select realtime.topic())))
        )
    $policy$;
  end if;
end $$;
