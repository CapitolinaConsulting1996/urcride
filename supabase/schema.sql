-- ============================================================
-- URCRide - Schema Database Supabase
-- ============================================================

-- Abilita l'estensione per UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILI UTENTI
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  phone text,
  whatsapp_number text,
  avatar_url text,
  address text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  role text not null default 'passenger' check (role in ('passenger', 'driver', 'rider')),
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profili visibili a tutti gli utenti autenticati"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Utente può modificare il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Utente può inserire il proprio profilo"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- ORARI ALLENAMENTI
-- ============================================================
create table public.training_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  time_start time not null,
  time_end time not null,
  type text not null check (type in ('arrival', 'departure'))
);

alter table public.training_schedules enable row level security;

create policy "Orari visibili a tutti gli autenticati"
  on public.training_schedules for select
  using (auth.role() = 'authenticated');

create policy "Utente gestisce i propri orari"
  on public.training_schedules for all
  using (auth.uid() = user_id);

-- ============================================================
-- OFFERTE DI PASSAGGIO
-- ============================================================
create table public.ride_offers (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  time_departure time not null,
  seats_available integer not null default 1,
  seats_total integer not null default 1,
  price_per_seat numeric(6,2) not null default 0,
  notes text,
  status text not null default 'active' check (status in ('active','full','cancelled','completed')),
  created_at timestamptz not null default now()
);

alter table public.ride_offers enable row level security;

create policy "Offerte visibili a tutti gli autenticati"
  on public.ride_offers for select
  using (auth.role() = 'authenticated');

create policy "Driver gestisce le proprie offerte"
  on public.ride_offers for all
  using (auth.uid() = driver_id);

-- ============================================================
-- RICHIESTE DI PASSAGGIO
-- ============================================================
create table public.ride_requests (
  id uuid primary key default uuid_generate_v4(),
  ride_offer_id uuid references public.ride_offers(id) on delete cascade not null,
  passenger_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  message text,
  created_at timestamptz not null default now(),
  unique(ride_offer_id, passenger_id)
);

alter table public.ride_requests enable row level security;

create policy "Richieste visibili al driver e al passeggero"
  on public.ride_requests for select
  using (
    auth.uid() = passenger_id or
    auth.uid() in (select driver_id from public.ride_offers where id = ride_offer_id)
  );

create policy "Passeggero può creare richieste"
  on public.ride_requests for insert
  with check (auth.uid() = passenger_id);

create policy "Driver può aggiornare stato richieste sue offerte"
  on public.ride_requests for update
  using (
    auth.uid() in (select driver_id from public.ride_offers where id = ride_offer_id)
    or auth.uid() = passenger_id
  );

-- ============================================================
-- PROFILI RIDER (a pagamento)
-- ============================================================
create table public.rider_profiles (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  price_per_seat numeric(6,2) not null default 5,
  bio text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  seats_total integer not null default 3,
  is_available boolean not null default true
);

alter table public.rider_profiles enable row level security;

create policy "Profili rider visibili a tutti gli autenticati"
  on public.rider_profiles for select
  using (auth.role() = 'authenticated');

create policy "Rider gestisce il proprio profilo"
  on public.rider_profiles for all
  using (auth.uid() = user_id);

-- ============================================================
-- MESSAGGI
-- ============================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Messaggi visibili solo a mittente e destinatario"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Utente può inviare messaggi"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Destinatario può segnare come letto"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- ============================================================
-- FUNZIONE: aggiorna posti disponibili dopo accettazione
-- ============================================================
create or replace function update_seats_on_accept()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'accepted' and OLD.status = 'pending' then
    update public.ride_offers
    set
      seats_available = seats_available - 1,
      status = case when seats_available - 1 <= 0 then 'full' else status end
    where id = NEW.ride_offer_id;
  end if;
  if NEW.status = 'rejected' and OLD.status = 'accepted' then
    update public.ride_offers
    set
      seats_available = seats_available + 1,
      status = 'active'
    where id = NEW.ride_offer_id;
  end if;
  return NEW;
end;
$$;

create trigger on_request_status_change
  after update on public.ride_requests
  for each row execute procedure update_seats_on_accept();

-- ============================================================
-- FUNZIONE: crea profilo automaticamente alla registrazione
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
