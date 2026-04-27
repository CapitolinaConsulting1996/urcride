-- ============================================================
-- URCRide v2 — Migration
-- Incolla nell'SQL Editor di Supabase e clicca Run
-- ============================================================

-- ── SQUADRE / CATEGORIE ──────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  color text default '#1a5c2e',
  created_at timestamptz default now()
);
alter table public.teams enable row level security;
create policy "Teams visibili a tutti" on public.teams for select using (auth.role() = 'authenticated');
create policy "Solo admin gestisce teams" on public.teams for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Inserisci squadre URC di default
insert into public.teams (name, category) values
  ('Prima Squadra', 'Senior M'),
  ('Serie C', 'Senior M'),
  ('Under 18', 'Youth'),
  ('Under 16', 'Youth'),
  ('Under 14', 'Youth'),
  ('Under 12', 'Youth'),
  ('Under 10', 'Youth'),
  ('Under 8', 'Youth'),
  ('Under 6', 'Youth'),
  ('Femminile', 'Senior F'),
  ('Veterani', 'Vets'),
  ('Staff tecnico', 'Staff')
on conflict do nothing;

-- ── AGGIORNA PROFILI ─────────────────────────────────────────
alter table public.profiles
  add column if not exists role_in_club text default 'other'
    check (role_in_club in ('parent','athlete','coach','staff','volunteer','other')),
  add column if not exists team_id uuid references public.teams(id),
  add column if not exists zone text,
  add column if not exists is_verified boolean default false,
  add column if not exists trips_completed integer default 0,
  add column if not exists rating_avg numeric(3,2) default 0,
  add column if not exists is_admin boolean default false;

-- ── EVENTI ───────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  event_type text not null default 'training'
    check (event_type in ('training','match','away','social','meeting','other')),
  date date not null,
  time_start time not null,
  time_end time,
  location text not null default 'Via Flaminia, 867, Roma',
  lat double precision default 41.9524171,
  lng double precision default 12.4815598,
  team_id uuid references public.teams(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.events enable row level security;
create policy "Eventi visibili a tutti" on public.events for select using (auth.role() = 'authenticated');
create policy "Admin gestisce eventi" on public.events for all using (
  exists (select 1 from public.profiles where id = auth.uid() and (is_admin = true or role = 'admin'))
);

-- ── AGGIORNA OFFERTE PASSAGGIO ───────────────────────────────
alter table public.ride_offers
  add column if not exists event_id uuid references public.events(id),
  add column if not exists team_id uuid references public.teams(id),
  add column if not exists direction text default 'to_field'
    check (direction in ('to_field','from_field','both')),
  add column if not exists return_time time,
  add column if not exists has_luggage boolean default false,
  add column if not exists preferences text[] default '{}',
  add column if not exists live_status text default 'not_started'
    check (live_status in ('not_started','departing','on_way','arrived','completed'));

-- ── LISTA ATTESA ─────────────────────────────────────────────
create table if not exists public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  ride_offer_id uuid references public.ride_offers(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  seats_requested integer default 1,
  created_at timestamptz default now(),
  unique(ride_offer_id, user_id)
);
alter table public.waitlist enable row level security;
create policy "Waitlist visibile all'interessato e al driver" on public.waitlist for select
  using (auth.uid() = user_id or
    auth.uid() in (select driver_id from public.ride_offers where id = ride_offer_id));
create policy "Utente può iscriversi in waitlist" on public.waitlist for insert
  with check (auth.uid() = user_id);
create policy "Utente può rimuoversi dalla waitlist" on public.waitlist for delete
  using (auth.uid() = user_id);

-- ── VALUTAZIONI ──────────────────────────────────────────────
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  ride_offer_id uuid references public.ride_offers(id) on delete cascade not null,
  rater_id uuid references public.profiles(id) on delete cascade not null,
  rated_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(ride_offer_id, rater_id)
);
alter table public.ratings enable row level security;
create policy "Rating visibili a tutti" on public.ratings for select using (auth.role() = 'authenticated');
create policy "Utente può dare rating" on public.ratings for insert with check (auth.uid() = rater_id);

-- Trigger per aggiornare rating_avg sul profilo
create or replace function update_rating_avg()
returns trigger language plpgsql as $$
begin
  update public.profiles
  set rating_avg = (
    select round(avg(score)::numeric, 2)
    from public.ratings where rated_id = NEW.rated_id
  )
  where id = NEW.rated_id;
  return NEW;
end;
$$;
drop trigger if exists on_rating_created on public.ratings;
create trigger on_rating_created
  after insert on public.ratings
  for each row execute procedure update_rating_avg();

-- ── NOTIFICHE ────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Notifiche solo all'utente" on public.notifications for all using (auth.uid() = user_id);

-- Aggiorna ride_requests con seats_requested
alter table public.ride_requests
  add column if not exists seats_requested integer default 1;

-- ── EVENTI DI TEST ───────────────────────────────────────────
insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
select
  'Allenamento Under 16', 'training',
  (current_date + 1)::date, '18:30', '20:30',
  'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
  id
from public.teams where name = 'Under 16' limit 1
on conflict do nothing;

insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
select
  'Partita Serie C vs Frascati', 'match',
  (current_date + 4)::date, '15:00', '17:00',
  'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
  id
from public.teams where name = 'Serie C' limit 1
on conflict do nothing;

insert into public.events (title, event_type, date, time_start, time_end, location, lat, lng, team_id)
select
  'Allenamento Prima Squadra', 'training',
  (current_date + 2)::date, '19:00', '21:00',
  'Campo URC, Via Flaminia 867', 41.9524171, 12.4815598,
  id
from public.teams where name = 'Prima Squadra' limit 1
on conflict do nothing;
