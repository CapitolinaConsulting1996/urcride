-- ============================================================
-- FIX 1: Aggiorna il trigger per gestire i conflitti
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- ============================================================
-- FIX 2: Assicurati che i 3 profili test esistano
-- (in caso il trigger li abbia saltati)
-- ============================================================
INSERT INTO public.profiles (id, email, full_name, phone, whatsapp_number, address, lat, lng, role, bio)
VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001',
  'marco.rossi@test.it',
  'Marco Rossi',
  '+39 333 1000001', '+39 333 1000001',
  'Via della Croce 10, Prati, Roma',
  41.9060, 12.4745, 'driver',
  'Padre di un rugbista, passo volentieri da Prati verso Via Flaminia'
),
(
  'aaaaaaaa-0000-0000-0000-000000000002',
  'sofia.bianchi@test.it',
  'Sofia Bianchi',
  '+39 333 1000002', '+39 333 1000002',
  'Viale Europa 150, EUR, Roma',
  41.8319, 12.4715, 'passenger',
  'Gioco nel femminile, vengo da EUR e cerco passaggi'
),
(
  'aaaaaaaa-0000-0000-0000-000000000003',
  'luca.verdi@test.it',
  'Luca Verdi',
  '+39 333 1000003', '+39 333 1000003',
  'Via Po 22, Parioli, Roma',
  41.9220, 12.4870, 'rider',
  'Rider, passo da Parioli → Via Flaminia ogni martedì e giovedì'
)
ON CONFLICT (id) DO UPDATE SET
  full_name       = EXCLUDED.full_name,
  phone           = EXCLUDED.phone,
  whatsapp_number = EXCLUDED.whatsapp_number,
  address         = EXCLUDED.address,
  lat             = EXCLUDED.lat,
  lng             = EXCLUDED.lng,
  role            = EXCLUDED.role,
  bio             = EXCLUDED.bio;

-- ============================================================
-- FIX 3: Orari e profilo rider (usa INSERT OR IGNORE)
-- ============================================================
INSERT INTO public.training_schedules (user_id, day_of_week, time_start, time_end, type)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'tuesday',  '18:30', '20:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'thursday', '18:30', '20:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'saturday', '10:00', '12:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'tuesday',  '18:30', '20:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'thursday', '18:30', '20:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'tuesday',  '18:00', '20:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'thursday', '18:00', '20:30', 'arrival'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'saturday', '09:30', '12:30', 'arrival')
ON CONFLICT DO NOTHING;

INSERT INTO public.rider_profiles (user_id, price_per_seat, vehicle_make, vehicle_model, vehicle_color, seats_total, is_available)
VALUES ('aaaaaaaa-0000-0000-0000-000000000003', 4.00, 'Toyota', 'Yaris', 'Grigio', 3, true)
ON CONFLICT (user_id) DO UPDATE SET
  price_per_seat = 4.00, vehicle_make = 'Toyota',
  vehicle_model = 'Yaris', vehicle_color = 'Grigio',
  seats_total = 3, is_available = true;

INSERT INTO public.ride_offers (driver_id, date, time_departure, seats_available, seats_total, price_per_seat, notes, status)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   (CURRENT_DATE + 1)::date, '18:15', 2, 2, 0,
   'Parto da Piazza del Risorgimento, posso fermarmi lungo Via Flaminia', 'active'),
  ('aaaaaaaa-0000-0000-0000-000000000003',
   (CURRENT_DATE + 2)::date, '17:50', 3, 3, 4.00,
   'Parioli → Via Flaminia, €4 a persona. Puntuale!', 'active')
ON CONFLICT DO NOTHING;
