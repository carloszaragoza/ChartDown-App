-- Rolls back ../migrations/20261021120000_live_sessions.sql: live sessions are forgotten, and their
-- notices stay as they were written.

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "live: members say they are here; the leader broadcasts" on realtime.messages';
    execute 'drop policy if exists "live: whoever may join listens" on realtime.messages';
  end if;
end $$;
alter publication supabase_realtime drop table public.live_sessions;
drop function public.live_end(uuid);
drop function public.live_hand_over(uuid, uuid);
drop function public.live_move(uuid, integer, integer, integer);
drop function public.live_start(uuid);
drop function private.close_stale_live(uuid);
drop function private.notify_live(public.live_sessions, text);
drop table public.live_sessions;
drop function private.leads_live(text);
drop function private.can_listen_live(text);
drop function private.live_topic_session(text);
drop function private.can_lead_live(uuid);
drop function private.can_join_live(uuid);
drop function private.may_join_live(uuid, uuid);
