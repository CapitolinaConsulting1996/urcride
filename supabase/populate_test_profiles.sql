-- Popola i profili dei 3 utenti test usando la loro email
-- (funziona indipendentemente dagli UUID assegnati da Supabase)

UPDATE public.profiles SET
  full_name       = 'Marco Rossi',
  phone           = '+39 333 1000001',
  whatsapp_number = '+39 333 1000001',
  address         = 'Via della Croce 10, Prati, Roma',
  lat             = 41.9060,
  lng             = 12.4745,
  role            = 'driver',
  bio             = 'Padre di un rugbista, passo volentieri da Prati verso Via Flaminia'
WHERE email = 'marco.rossi@test.it';

UPDATE public.profiles SET
  full_name       = 'Sofia Bianchi',
  phone           = '+39 333 1000002',
  whatsapp_number = '+39 333 1000002',
  address         = 'Viale Europa 150, EUR, Roma',
  lat             = 41.8319,
  lng             = 12.4715,
  role            = 'passenger',
  bio             = 'Gioco nel femminile, vengo da EUR e cerco passaggi per gli allenamenti'
WHERE email = 'sofia.bianchi@test.it';

UPDATE public.profiles SET
  full_name       = 'Luca Verdi',
  phone           = '+39 333 1000003',
  whatsapp_number = '+39 333 1000003',
  address         = 'Via Po 22, Parioli, Roma',
  lat             = 41.9220,
  lng             = 12.4870,
  role            = 'rider',
  bio             = 'Rider, passo da Parioli → Via Flaminia ogni martedì e giovedì'
WHERE email = 'luca.verdi@test.it';

-- Orari allenamenti (usa subquery per ricavare l''UUID dall''email)
INSERT INTO public.training_schedules (user_id, day_of_week, time_start, time_end, type)
SELECT id, 'tuesday',  '18:30'::time, '20:30'::time, 'arrival'  FROM public.profiles WHERE email = 'marco.rossi@test.it'
UNION ALL
SELECT id, 'thursday', '18:30'::time, '20:30'::time, 'arrival'  FROM public.profiles WHERE email = 'marco.rossi@test.it'
UNION ALL
SELECT id, 'saturday', '10:00'::time, '12:30'::time, 'arrival'  FROM public.profiles WHERE email = 'marco.rossi@test.it'
UNION ALL
SELECT id, 'tuesday',  '18:30'::time, '20:30'::time, 'arrival'  FROM public.profiles WHERE email = 'sofia.bianchi@test.it'
UNION ALL
SELECT id, 'thursday', '18:30'::time, '20:30'::time, 'arrival'  FROM public.profiles WHERE email = 'sofia.bianchi@test.it'
UNION ALL
SELECT id, 'tuesday',  '18:00'::time, '20:30'::time, 'arrival'  FROM public.profiles WHERE email = 'luca.verdi@test.it'
UNION ALL
SELECT id, 'thursday', '18:00'::time, '20:30'::time, 'arrival'  FROM public.profiles WHERE email = 'luca.verdi@test.it'
UNION ALL
SELECT id, 'saturday', '09:30'::time, '12:30'::time, 'arrival'  FROM public.profiles WHERE email = 'luca.verdi@test.it';

-- Profilo rider per Luca
INSERT INTO public.rider_profiles (user_id, price_per_seat, vehicle_make, vehicle_model, vehicle_color, seats_total, is_available)
SELECT id, 4.00, 'Toyota', 'Yaris', 'Grigio', 3, true
FROM public.profiles WHERE email = 'luca.verdi@test.it'
ON CONFLICT (user_id) DO UPDATE SET
  price_per_seat = 4.00, vehicle_make = 'Toyota',
  vehicle_model  = 'Yaris', vehicle_color = 'Grigio',
  seats_total = 3, is_available = true;

-- Offerte di passaggio
INSERT INTO public.ride_offers (driver_id, date, time_departure, seats_available, seats_total, price_per_seat, notes, status)
SELECT id, (CURRENT_DATE + 1)::date, '18:15', 2, 2, 0,
  'Parto da Piazza del Risorgimento, posso fermarmi lungo Via Flaminia', 'active'
FROM public.profiles WHERE email = 'marco.rossi@test.it';

INSERT INTO public.ride_offers (driver_id, date, time_departure, seats_available, seats_total, price_per_seat, notes, status)
SELECT id, (CURRENT_DATE + 2)::date, '17:50', 3, 3, 4.00,
  'Parioli → Via Flaminia, €4 a persona. Puntuale!', 'active'
FROM public.profiles WHERE email = 'luca.verdi@test.it';
