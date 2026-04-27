-- ============================================================
-- URCRide — Allenamenti ricorrenti Under 14
-- Incolla nell'SQL Editor di Supabase e clicca Run
--
-- Orari Under 14:
--   Lunedì    17:30–19:00
--   Martedì   15:30–17:00
--   Giovedì   17:00–18:30
--   Venerdì   17:00–18:30
-- ============================================================

do $$
declare
  v_team_id uuid;
begin
  select id into v_team_id from public.teams where name = 'Under 14' limit 1;

  if v_team_id is null then
    raise exception 'Team "Under 14" not found. Run v2_migration.sql first.';
  end if;

  -- Lunedì 17:30–19:00
  insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
  select
    'Allenamento Under 14', 'training',
    d::date, '17:30', '19:00',
    'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
    v_team_id
  from generate_series(
    -- prossimo lunedì da oggi (o oggi se già lunedì)
    current_date + ((1 - extract(dow from current_date)::int + 7) % 7) * interval '1 day',
    current_date + interval '3 months',
    interval '1 week'
  ) as d;

  -- Martedì 15:30–17:00
  insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
  select
    'Allenamento Under 14', 'training',
    d::date, '15:30', '17:00',
    'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
    v_team_id
  from generate_series(
    current_date + ((2 - extract(dow from current_date)::int + 7) % 7) * interval '1 day',
    current_date + interval '3 months',
    interval '1 week'
  ) as d;

  -- Giovedì 17:00–18:30
  insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
  select
    'Allenamento Under 14', 'training',
    d::date, '17:00', '18:30',
    'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
    v_team_id
  from generate_series(
    current_date + ((4 - extract(dow from current_date)::int + 7) % 7) * interval '1 day',
    current_date + interval '3 months',
    interval '1 week'
  ) as d;

  -- Venerdì 17:00–18:30
  insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
  select
    'Allenamento Under 14', 'training',
    d::date, '17:00', '18:30',
    'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
    v_team_id
  from generate_series(
    current_date + ((5 - extract(dow from current_date)::int + 7) % 7) * interval '1 day',
    current_date + interval '3 months',
    interval '1 week'
  ) as d;

  raise notice 'Allenamenti Under 14 inseriti con successo fino al %', (current_date + interval '3 months')::date;
end;
$$;
