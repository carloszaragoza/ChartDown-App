-- T-703: saving a set's lineup (R-05.3, Technical Plan 4). Keys use the policy on set_items
-- (T-304). Rolled back by ../rollbacks/<same name>.

-- The whole lineup at once, as [{"member_id": …, "instrument_ids": […]}, …], with the person's
-- own permissions: the MD or the set's temporary MD (R-05.5). Only what changed is deleted or
-- added, so each event says exactly who joined, who left and which instrument changed (R-09.3).
-- A member missing from the list, or with no instruments, does not play in this set.
create function public.save_lineup(set_id uuid, entries jsonb) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare
  band uuid;
begin
  select s.band_id into band from public.sets s where s.id = save_lineup.set_id;
  if band is null or not (private.is_md(band) or private.is_temp_md(save_lineup.set_id)) then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(save_lineup.entries, '[]'::jsonb)) <> 'array' then
    raise exception 'lineup_invalid' using errcode = 'invalid_parameter_value';
  end if;

  with wanted as (
    select distinct (entry ->> 'member_id')::uuid as member_id, instrument::uuid as instrument_id
    from jsonb_array_elements(coalesce(save_lineup.entries, '[]'::jsonb)) entry,
         jsonb_array_elements_text(coalesce(entry -> 'instrument_ids', '[]'::jsonb)) instrument
  )
  delete from public.set_lineup l
  where l.set_id = save_lineup.set_id
    and not exists (select 1 from wanted w where w.member_id = l.member_id and w.instrument_id = l.instrument_id);

  insert into public.set_lineup (set_id, band_id, member_id, instrument_id)
  select distinct save_lineup.set_id, band, (entry ->> 'member_id')::uuid, instrument::uuid
  from jsonb_array_elements(coalesce(save_lineup.entries, '[]'::jsonb)) entry,
       jsonb_array_elements_text(coalesce(entry -> 'instrument_ids', '[]'::jsonb)) instrument
  on conflict (set_id, member_id, instrument_id) do nothing;
end;
$$;
revoke all on function public.save_lineup(uuid, jsonb) from public, anon;
grant execute on function public.save_lineup(uuid, jsonb) to authenticated;
