-- Rolls back ../migrations/20261030120000_live_sync_messages.sql: only the leader broadcasts on a
-- session's channel again.

do $$
begin
  if to_regclass('realtime.messages') is not null
     and to_regprocedure('realtime.topic()') is not null then
    execute 'drop policy if exists "live: members say they are here and keep the clock" on realtime.messages';
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

drop function private.may_send_live(text);
