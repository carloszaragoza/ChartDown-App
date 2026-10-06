-- T-1002: new notices reach the person's open app at once, through Supabase Realtime, which
-- applies the "read your own" policy to each one (Technical Plan 7). Rolled back by
-- ../rollbacks/<same name>.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.notifications;
