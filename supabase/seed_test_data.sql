-- ============================================================
-- URCRide - Dati di test
-- Incolla questo nell'SQL Editor di Supabase e clicca Run
-- ============================================================

-- Crea 3 utenti di test in auth.users
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_user_meta_data,
  is_super_admin, confirmation_token
) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'marco.rossi@test.it',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"full_name": "Marco Rossi"}',
  false, ''
),
(
  'aaaaaaaa-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'sofia.bianchi@test.it',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"full_name": "Sofia Bianchi"}',
  false, ''
),
(
  'aaaaaaaa-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'luca.verdi@test.it',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"full_name": "Luca Verdi"}',
  false, ''
)
ON CONFLICT (id) DO NOTHING;

-- Aggiorna i profili (il trigger li ha già creati, li completiamo)
UPDATE public.profiles SET
  full_name    = 'Marco Rossi',
  phone        = '+39 333 1000001',
  whatsapp_number = '+39 333 1000001',
  address      = 'Via della Croce 10, Prati, Roma',
  lat          = 41.9060,
  lng          = 12.4745,
  role         = 'driver',
  bio          = 'Padre di un rugbista, passo volentieri da Prati verso Via Flaminia'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

UPDATE public.profiles SET
  full_name    = 'Sofia Bianchi',
  phone        = '+39 333 1000002',
  whatsapp_number = '+39 333 1000002',
  address      = 'Viale Europa 150, EUR, Roma',
  lat          = 41.8319,
  lng          = 12.4715,
  role         = 'passenger',
  bio          = 'Gioco nel femminile, vengo da EUR e cerco passaggi per gli allenamenti'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002';

UPDATE public.profiles SET
  full_name    = 'Luca Verdi',
  phone        = '+39 333 1000003',
  whatsapp_number = '+39 333 1000003',
  address      = 'Via Po 22, Parioli, Roma',
  lat          = 41.9220,
  lng          = 12.4870,
  role         = 'rider',
  bio          = 'Rider professionista, passo da Parioli → Via Flaminia ogni martedì e giovedì'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000003';

-- Orari allenamenti
INSERT INTO public.training_schedules (user_id, day_of_week, time_start, time_end, type) VALUES
-- Marco: martedì e giovedì sera, va al campo
('aaaaaaaa-0000-0000-0000-000000000001', 'tuesday',  '18:30', '20:30', 'arrival'),
('aaaaaaaa-0000-0000-0000-000000000001', 'thursday', '18:30', '20:30', 'arrival'),
('aaaaaaaa-0000-0000-0000-000000000001', 'saturday', '10:00', '12:30', 'arrival'),
-- Sofia: stessi giorni, va al campo e torna
('aaaaaaaa-0000-0000-0000-000000000002', 'tuesday',  '18:30', '20:30', 'arrival'),
('aaaaaaaa-0000-0000-0000-000000000002', 'thursday', '18:30', '20:30', 'arrival'),
('aaaaaaaa-0000-0000-0000-000000000002', 'tuesday',  '20:30', '21:30', 'departure'),
-- Luca: martedì, giovedì, sabato
('aaaaaaaa-0000-0000-0000-000000000003', 'tuesday',  '18:00', '20:30', 'arrival'),
('aaaaaaaa-0000-0000-0000-000000000003', 'thursday', '18:00', '20:30', 'arrival'),
('aaaaaaaa-0000-0000-0000-000000000003', 'saturday', '09:30', '12:30', 'arrival')
ON CONFLICT DO NOTHING;

-- Profilo rider per Luca
INSERT INTO public.rider_profiles (user_id, price_per_seat, bio, vehicle_make, vehicle_model, vehicle_color, seats_total, is_available)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000003',
  4.00,
  'Passo da Parioli, il campo URC è praticamente sul mio percorso',
  'Toyota', 'Yaris', 'Grigio',
  3, true
)
ON CONFLICT (user_id) DO UPDATE SET
  price_per_seat = 4.00,
  vehicle_make   = 'Toyota',
  vehicle_model  = 'Yaris',
  vehicle_color  = 'Grigio',
  seats_total    = 3,
  is_available   = true;

-- Offerta di passaggio da Marco per domani
INSERT INTO public.ride_offers (driver_id, date, time_departure, seats_available, seats_total, price_per_seat, notes, status)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  (CURRENT_DATE + INTERVAL '1 day')::date,
  '18:15',
  2, 2, 0,
  'Parto da Piazza del Risorgimento, posso fermarmi lungo Via Flaminia',
  'active'
);

-- Offerta di passaggio da Luca per dopodomani
INSERT INTO public.ride_offers (driver_id, date, time_departure, seats_available, seats_total, price_per_seat, notes, status)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000003',
  (CURRENT_DATE + INTERVAL '2 days')::date,
  '17:50',
  3, 3, 4.00,
  'Parioli → Via Flaminia, €4 a persona. Puntuale!',
  'active'
);
