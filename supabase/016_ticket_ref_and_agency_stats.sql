-- ============================================================
-- YENDI - 016_ticket_ref_and_agency_stats.sql
-- Ajoute un ticket_ref unique lisible sur chaque réservation
-- + fonction stats pour le dashboard agence
-- ============================================================

-- ═══ 1. Ajouter colonne ticket_ref ═══
ALTER TABLE public.seat_reservations
ADD COLUMN IF NOT EXISTS ticket_ref TEXT;

-- Index unique pour retrouver rapidement par ref
CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_reservations_ticket_ref 
ON public.seat_reservations(ticket_ref) WHERE ticket_ref IS NOT NULL;

-- ═══ 2. Fonction pour générer un ticket_ref lisible ═══
-- Format: YD-XXXXXX (6 caractères alphanumériques)
CREATE OR REPLACE FUNCTION public.generate_ticket_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_ref TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Générer un code alphanumérique de 6 caractères
    v_ref := 'YD' || UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT) FROM 1 FOR 6));
    -- Vérifier unicité
    SELECT EXISTS(SELECT 1 FROM public.seat_reservations WHERE ticket_ref = v_ref) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_ref;
    END IF;
  END LOOP;
END;
$$;

-- ═══ 3. Mettre à jour create_group_reservation pour générer ticket_ref ═══
CREATE OR REPLACE FUNCTION public.create_group_reservation(
  p_scheduled_trip_id UUID,
  p_passengers JSONB,
  p_booked_by_client_id UUID DEFAULT NULL,
  p_booked_by_name TEXT DEFAULT NULL,
  p_booked_by_phone TEXT DEFAULT NULL,
  p_booked_by_email TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'mobile_money'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip RECORD;
  v_passenger JSONB;
  v_seat_number INTEGER;
  v_existing RECORD;
  v_booking_group_id UUID;
  v_ticket_ref TEXT;
  v_ticket_refs TEXT[] := '{}';
  v_total_passengers INTEGER;
  v_unit_price INTEGER;
  v_seat_numbers INTEGER[] := '{}';
BEGIN
  -- 1. Vérifier trajet actif
  SELECT id, available_seat_numbers, available_seats_count, base_price
  INTO v_trip
  FROM public.scheduled_trips
  WHERE id = p_scheduled_trip_id AND status = 'actif'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trajet non trouvé ou inactif');
  END IF;
  
  v_total_passengers := jsonb_array_length(p_passengers);
  v_unit_price := v_trip.base_price;
  
  -- 2. Vérifier disponibilité de tous les sièges
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
  LOOP
    v_seat_number := (v_passenger->>'seat_number')::INTEGER;
    
    IF NOT (v_seat_number = ANY(v_trip.available_seat_numbers)) THEN
      RETURN json_build_object('success', false, 'error', format('Le siège %s n''est pas disponible à la vente', v_seat_number));
    END IF;
    
    SELECT id, status INTO v_existing
    FROM public.seat_reservations
    WHERE scheduled_trip_id = p_scheduled_trip_id AND seat_number = v_seat_number;
    
    IF FOUND AND v_existing.status IN ('reserve', 'confirme') THEN
      RETURN json_build_object('success', false, 'error', format('Le siège %s est déjà réservé', v_seat_number), 'conflict_seats', json_build_array(v_seat_number));
    END IF;
    
    v_seat_numbers := array_append(v_seat_numbers, v_seat_number);
  END LOOP;
  
  -- 3. Vérifier capacité
  IF v_trip.available_seats_count < v_total_passengers THEN
    RETURN json_build_object('success', false, 'error', format('Seulement %s places disponibles', v_trip.available_seats_count));
  END IF;
  
  -- 4. Créer le booking_group
  INSERT INTO public.booking_groups (
    booked_by_client_id, booked_by_name, booked_by_phone, booked_by_email,
    scheduled_trip_id, payment_method, payment_status,
    total_passengers, unit_price, total_amount, paid_at
  ) VALUES (
    p_booked_by_client_id, COALESCE(p_booked_by_name, 'Client'), COALESCE(p_booked_by_phone, ''), p_booked_by_email,
    p_scheduled_trip_id, p_payment_method, 'paid',
    v_total_passengers, v_unit_price, v_unit_price * v_total_passengers, NOW()
  )
  RETURNING id INTO v_booking_group_id;
  
  -- 5. Créer chaque réservation avec ticket_ref
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
  LOOP
    v_seat_number := (v_passenger->>'seat_number')::INTEGER;
    v_ticket_ref := generate_ticket_ref();
    v_ticket_refs := array_append(v_ticket_refs, v_ticket_ref);
    
    SELECT id, status INTO v_existing
    FROM public.seat_reservations
    WHERE scheduled_trip_id = p_scheduled_trip_id AND seat_number = v_seat_number;
    
    IF FOUND THEN
      UPDATE public.seat_reservations
      SET status = 'confirme',
          passenger_name = v_passenger->>'name',
          passenger_phone = v_passenger->>'phone',
          booking_group_id = v_booking_group_id,
          booked_by_client_id = p_booked_by_client_id,
          ticket_ref = v_ticket_ref,
          reserved_at = NOW()
      WHERE id = v_existing.id;
    ELSE
      INSERT INTO public.seat_reservations (
        scheduled_trip_id, seat_number, status,
        passenger_name, passenger_phone,
        booking_group_id, booked_by_client_id, ticket_ref, reserved_at
      ) VALUES (
        p_scheduled_trip_id, v_seat_number, 'confirme',
        v_passenger->>'name', v_passenger->>'phone',
        v_booking_group_id, p_booked_by_client_id, v_ticket_ref, NOW()
      );
    END IF;
  END LOOP;
  
  -- 6. Décrémenter places
  UPDATE public.scheduled_trips
  SET available_seats_count = available_seats_count - v_total_passengers
  WHERE id = p_scheduled_trip_id AND available_seats_count >= v_total_passengers;
  
  RETURN json_build_object(
    'success', true,
    'booking_group_id', v_booking_group_id,
    'ticket_ids', v_ticket_refs,
    'seat_numbers', v_seat_numbers,
    'total_passengers', v_total_passengers,
    'total_amount', v_unit_price * v_total_passengers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_reservation TO anon;
GRANT EXECUTE ON FUNCTION public.create_group_reservation TO authenticated;

-- ═══ 4. Générer des ticket_ref pour les réservations existantes qui n'en ont pas ═══
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.seat_reservations WHERE ticket_ref IS NULL AND status IN ('reserve', 'confirme')
  LOOP
    UPDATE public.seat_reservations SET ticket_ref = generate_ticket_ref() WHERE id = r.id;
  END LOOP;
END;
$$;

-- ═══ 5. Mettre à jour get_client_reservations pour retourner ticket_ref ═══
DROP FUNCTION IF EXISTS public.get_client_reservations(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_client_reservations(
  p_client_id UUID DEFAULT NULL, 
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  reservation_id UUID,
  seat_number INTEGER,
  reservation_status TEXT,
  passenger_name TEXT,
  passenger_phone TEXT,
  reserved_at TIMESTAMPTZ,
  booking_group_id UUID,
  booked_by_client_id UUID,
  booked_by_name TEXT,
  booked_by_phone TEXT,
  ticket_ref TEXT,
  trip_id UUID,
  departure_datetime TIMESTAMPTZ,
  arrival_datetime TIMESTAMPTZ,
  price INTEGER,
  trip_status TEXT,
  departure_city TEXT,
  departure_location TEXT,
  arrival_city TEXT,
  arrival_location TEXT,
  agency_name TEXT,
  agency_color TEXT,
  duration_hours DOUBLE PRECISION,
  trip_type TEXT,
  is_main_booker BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    sr.id, sr.seat_number, sr.status, sr.passenger_name, sr.passenger_phone,
    sr.reserved_at, sr.booking_group_id, sr.booked_by_client_id,
    bg.booked_by_name, bg.booked_by_phone, sr.ticket_ref,
    st.id, st.departure_datetime, st.arrival_datetime, st.base_price,
    st.status, r.departure_city, r.departure_location, r.arrival_city, r.arrival_location,
    a.name, a.color,
    EXTRACT(EPOCH FROM (st.arrival_datetime - st.departure_datetime)) / 3600,
    CASE 
      WHEN r.stops IS NULL OR jsonb_array_length(r.stops) = 0 THEN 'Direct'
      WHEN jsonb_array_length(r.stops) = 1 THEN '1 Arrêt'
      ELSE jsonb_array_length(r.stops)::TEXT || ' Arrêts'
    END,
    (sr.booked_by_client_id = p_client_id)
  FROM public.seat_reservations sr
  LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  JOIN public.routes r ON st.route_id = r.id
  JOIN public.buses b ON st.bus_id = b.id
  JOIN public.agencies a ON st.agency_id = a.id
  WHERE sr.status IN ('reserve', 'confirme')
    AND (sr.booked_by_client_id = p_client_id OR sr.passenger_phone = p_phone OR bg.booked_by_phone = p_phone)
  ORDER BY sr.reserved_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_reservations TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_reservations TO authenticated;

-- ═══ 6. Fonction stats agence pour le dashboard réservations ═══
DROP FUNCTION IF EXISTS public.get_agency_reservation_stats;
DROP FUNCTION IF EXISTS public.get_agency_reservation_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_agency_reservation_stats(p_agency_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_count INTEGER;
  v_yesterday_count INTEGER;
  v_today_revenue INTEGER;
  v_yesterday_revenue INTEGER;
  v_total_seats INTEGER;
  v_occupied_seats INTEGER;
  v_mobile_money_count INTEGER;
  v_card_count INTEGER;
BEGIN
  -- Réservations aujourd'hui
  SELECT COUNT(*) INTO v_today_count
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND sr.reserved_at::DATE = CURRENT_DATE;

  -- Réservations hier
  SELECT COUNT(*) INTO v_yesterday_count
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND sr.reserved_at::DATE = CURRENT_DATE - 1;

  -- Revenus aujourd'hui
  SELECT COALESCE(SUM(st.base_price), 0) INTO v_today_revenue
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND sr.reserved_at::DATE = CURRENT_DATE;

  -- Revenus hier
  SELECT COALESCE(SUM(st.base_price), 0) INTO v_yesterday_revenue
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND sr.reserved_at::DATE = CURRENT_DATE - 1;

  -- Taux remplissage (trajets actifs)
  SELECT COALESCE(SUM(st.total_seats), 0), COALESCE(SUM(st.total_seats - st.available_seats_count), 0)
  INTO v_total_seats, v_occupied_seats
  FROM public.scheduled_trips st
  WHERE st.agency_id = p_agency_id AND st.status = 'actif';

  -- Paiements Mobile Money
  SELECT COUNT(*) INTO v_mobile_money_count
  FROM public.seat_reservations sr
  JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND bg.payment_method = 'mobile_money';

  -- Paiements Carte
  SELECT COUNT(*) INTO v_card_count
  FROM public.seat_reservations sr
  JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND bg.payment_method = 'card';

  RETURN json_build_object(
    'today_count', v_today_count,
    'yesterday_count', v_yesterday_count,
    'today_revenue', v_today_revenue,
    'yesterday_revenue', v_yesterday_revenue,
    'total_seats', v_total_seats,
    'occupied_seats', v_occupied_seats,
    'fill_rate', CASE WHEN v_total_seats > 0 THEN ROUND((v_occupied_seats::NUMERIC / v_total_seats) * 100) ELSE 0 END,
    'mobile_money_count', v_mobile_money_count,
    'card_count', v_card_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_reservation_stats TO authenticated;

-- ═══ 7. Fonction recherche réservations agence ═══
DROP FUNCTION IF EXISTS public.get_agency_reservations;
DROP FUNCTION IF EXISTS public.get_agency_reservations(UUID, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_agency_reservations(
  p_agency_id UUID,
  p_search TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_route_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_rows JSON;
BEGIN
  -- Compter le total
  SELECT COUNT(*) INTO v_total
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.routes r ON st.route_id = r.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
    AND (p_search IS NULL OR (
      sr.passenger_name ILIKE '%' || p_search || '%'
      OR sr.passenger_phone ILIKE '%' || p_search || '%'
      OR sr.ticket_ref ILIKE '%' || p_search || '%'
      OR bg.booked_by_name ILIKE '%' || p_search || '%'
      OR bg.booked_by_phone ILIKE '%' || p_search || '%'
    ))
    AND (p_payment_method IS NULL OR bg.payment_method = p_payment_method)
    AND (p_route_id IS NULL OR st.route_id = p_route_id)
    AND (p_date_from IS NULL OR st.departure_datetime::DATE >= p_date_from)
    AND (p_date_to IS NULL OR st.departure_datetime::DATE <= p_date_to);

  -- Récupérer les lignes
  SELECT json_agg(row_data) INTO v_rows
  FROM (
    SELECT json_build_object(
      'reservation_id', sr.id,
      'ticket_ref', sr.ticket_ref,
      'seat_number', sr.seat_number,
      'status', sr.status,
      'passenger_name', sr.passenger_name,
      'passenger_phone', sr.passenger_phone,
      'reserved_at', sr.reserved_at,
      'booking_group_id', sr.booking_group_id,
      'booked_by_name', bg.booked_by_name,
      'booked_by_phone', bg.booked_by_phone,
      'booked_by_email', bg.booked_by_email,
      'payment_method', bg.payment_method,
      'payment_status', bg.payment_status,
      'total_passengers', bg.total_passengers,
      'group_total_amount', bg.total_amount,
      'trip_id', st.id,
      'departure_datetime', st.departure_datetime,
      'arrival_datetime', st.arrival_datetime,
      'price', st.base_price,
      'trip_status', st.status,
      'departure_city', r.departure_city,
      'departure_location', r.departure_location,
      'arrival_city', r.arrival_city,
      'arrival_location', r.arrival_location,
      'route_id', r.id,
      'bus_number', b.number,
      'bus_plate', b.plate,
      'agency_name', a.name,
      'agency_color', a.color,
      'duration_hours', EXTRACT(EPOCH FROM (st.arrival_datetime - st.departure_datetime)) / 3600
    ) AS row_data
    FROM public.seat_reservations sr
    JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
    LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
    JOIN public.routes r ON st.route_id = r.id
    JOIN public.buses b ON st.bus_id = b.id
    JOIN public.agencies a ON st.agency_id = a.id
    WHERE st.agency_id = p_agency_id
      AND sr.status IN ('reserve', 'confirme')
      AND (p_search IS NULL OR (
        sr.passenger_name ILIKE '%' || p_search || '%'
        OR sr.passenger_phone ILIKE '%' || p_search || '%'
        OR sr.ticket_ref ILIKE '%' || p_search || '%'
        OR bg.booked_by_name ILIKE '%' || p_search || '%'
        OR bg.booked_by_phone ILIKE '%' || p_search || '%'
      ))
      AND (p_payment_method IS NULL OR bg.payment_method = p_payment_method)
      AND (p_route_id IS NULL OR st.route_id = p_route_id)
      AND (p_date_from IS NULL OR st.departure_datetime::DATE >= p_date_from)
      AND (p_date_to IS NULL OR st.departure_datetime::DATE <= p_date_to)
    ORDER BY sr.reserved_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN json_build_object(
    'total', v_total,
    'data', COALESCE(v_rows, '[]'::JSON)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_reservations TO authenticated;
