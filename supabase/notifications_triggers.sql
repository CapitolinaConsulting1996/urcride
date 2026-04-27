-- ============================================================
-- Trigger notifiche automatiche
-- Incolla nell'SQL Editor di Supabase e clicca Run
-- ============================================================

-- 1. Notifica al DRIVER quando riceve una richiesta
CREATE OR REPLACE FUNCTION notify_driver_on_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_driver_id uuid;
  v_passenger_name text;
  v_ride_date text;
BEGIN
  SELECT driver_id, to_char(date, 'DD/MM/YYYY')
    INTO v_driver_id, v_ride_date
  FROM public.ride_offers WHERE id = NEW.ride_offer_id;

  SELECT full_name INTO v_passenger_name
  FROM public.profiles WHERE id = NEW.passenger_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_driver_id,
    'ride_request',
    'Nuova richiesta di passaggio',
    v_passenger_name || ' vuole unirsi al tuo passaggio del ' || v_ride_date,
    jsonb_build_object(
      'ride_offer_id', NEW.ride_offer_id,
      'request_id', NEW.id,
      'passenger_id', NEW.passenger_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ride_request_created ON public.ride_requests;
CREATE TRIGGER on_ride_request_created
  AFTER INSERT ON public.ride_requests
  FOR EACH ROW EXECUTE PROCEDURE notify_driver_on_request();

-- 2. Notifica al PASSEGGERO quando la richiesta viene accettata o rifiutata
CREATE OR REPLACE FUNCTION notify_passenger_on_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_driver_name text;
  v_ride_date text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT p.full_name, to_char(ro.date, 'DD/MM/YYYY')
    INTO v_driver_name, v_ride_date
  FROM public.ride_offers ro
  JOIN public.profiles p ON p.id = ro.driver_id
  WHERE ro.id = NEW.ride_offer_id;

  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.passenger_id,
      'request_accepted',
      '🎉 Richiesta accettata!',
      v_driver_name || ' ha confermato il tuo posto per il ' || v_ride_date,
      jsonb_build_object('ride_offer_id', NEW.ride_offer_id, 'request_id', NEW.id)
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.passenger_id,
      'request_rejected',
      'Richiesta non accettata',
      v_driver_name || ' non può prenderti il ' || v_ride_date,
      jsonb_build_object('ride_offer_id', NEW.ride_offer_id, 'request_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ride_request_updated ON public.ride_requests;
CREATE TRIGGER on_ride_request_updated
  AFTER UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE PROCEDURE notify_passenger_on_status_change();
