-- ============================================================
-- YENDI - 015_fix_group_reservation.sql
-- FIX: create_group_reservation échoue quand les sièges ont
-- déjà une ligne avec status='disponible' (contrainte UNIQUE)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_group_reservation(
  p_scheduled_trip_id UUID,
  p_passengers JSONB,  -- [{"seat_number": 1, "name": "John", "phone": "..."}, ...]
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
  v_reservation_id UUID;
  v_booking_group_id UUID;
  v_ticket_ids TEXT[] := '{}';
  v_total_passengers INTEGER;
  v_unit_price INTEGER;
  v_seat_numbers INTEGER[] := '{}';
BEGIN
  -- 1. Vérifier que le trajet existe et est actif
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
  
  -- 2. Vérifier que tous les sièges demandés sont disponibles
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
  LOOP
    v_seat_number := (v_passenger->>'seat_number')::INTEGER;
    
    -- Vérifier que le siège est dans les places disponibles à la vente
    IF NOT (v_seat_number = ANY(v_trip.available_seat_numbers)) THEN
      RETURN json_build_object(
        'success', false, 
        'error', format('Le siège %s n''est pas disponible à la vente', v_seat_number)
      );
    END IF;
    
    -- Vérifier qu'il n'y a pas déjà une réservation confirmée pour ce siège
    SELECT id, status INTO v_existing
    FROM public.seat_reservations
    WHERE scheduled_trip_id = p_scheduled_trip_id AND seat_number = v_seat_number;
    
    IF FOUND AND v_existing.status IN ('reserve', 'confirme') THEN
      RETURN json_build_object(
        'success', false, 
        'error', format('Le siège %s est déjà réservé', v_seat_number),
        'conflict_seats', json_build_array(v_seat_number)
      );
    END IF;
    
    v_seat_numbers := array_append(v_seat_numbers, v_seat_number);
  END LOOP;
  
  -- 3. Vérifier qu'il y a assez de places disponibles
  IF v_trip.available_seats_count < v_total_passengers THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('Seulement %s places disponibles', v_trip.available_seats_count)
    );
  END IF;
  
  -- 4. Créer le groupe de réservation
  INSERT INTO public.booking_groups (
    booked_by_client_id,
    booked_by_name,
    booked_by_phone,
    booked_by_email,
    scheduled_trip_id,
    payment_method,
    payment_status,
    total_passengers,
    unit_price,
    total_amount,
    paid_at
  ) VALUES (
    p_booked_by_client_id,
    COALESCE(p_booked_by_name, 'Client'),
    COALESCE(p_booked_by_phone, ''),
    p_booked_by_email,
    p_scheduled_trip_id,
    p_payment_method,
    'paid',
    v_total_passengers,
    v_unit_price,
    v_unit_price * v_total_passengers,
    NOW()
  )
  RETURNING id INTO v_booking_group_id;
  
  -- 5. Créer une réservation pour chaque passager
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
  LOOP
    v_seat_number := (v_passenger->>'seat_number')::INTEGER;
    
    -- Générer un ID de ticket unique
    v_ticket_ids := array_append(v_ticket_ids, 'YD' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'));
    
    -- FIX: Vérifier si une ligne existe déjà pour ce siège
    SELECT id, status INTO v_existing
    FROM public.seat_reservations
    WHERE scheduled_trip_id = p_scheduled_trip_id AND seat_number = v_seat_number;
    
    IF FOUND THEN
      -- Ligne existante (disponible ou annulée) → UPDATE au lieu d'INSERT
      UPDATE public.seat_reservations
      SET status = 'confirme',
          passenger_name = v_passenger->>'name',
          passenger_phone = v_passenger->>'phone',
          booking_group_id = v_booking_group_id,
          booked_by_client_id = p_booked_by_client_id,
          reserved_at = NOW()
      WHERE id = v_existing.id;
    ELSE
      -- Pas de ligne existante → INSERT
      INSERT INTO public.seat_reservations (
        scheduled_trip_id,
        seat_number,
        status,
        passenger_name,
        passenger_phone,
        booking_group_id,
        booked_by_client_id,
        reserved_at
      ) VALUES (
        p_scheduled_trip_id,
        v_seat_number,
        'confirme',
        v_passenger->>'name',
        v_passenger->>'phone',
        v_booking_group_id,
        p_booked_by_client_id,
        NOW()
      );
    END IF;
  END LOOP;
  
  -- 6. Mettre à jour le compteur de places disponibles
  UPDATE public.scheduled_trips
  SET available_seats_count = available_seats_count - v_total_passengers
  WHERE id = p_scheduled_trip_id AND available_seats_count >= v_total_passengers;
  
  RETURN json_build_object(
    'success', true,
    'booking_group_id', v_booking_group_id,
    'ticket_ids', v_ticket_ids,
    'seat_numbers', v_seat_numbers,
    'total_passengers', v_total_passengers,
    'total_amount', v_unit_price * v_total_passengers
  );
END;
$$;

-- Redonner les accès
GRANT EXECUTE ON FUNCTION public.create_group_reservation TO anon;
GRANT EXECUTE ON FUNCTION public.create_group_reservation TO authenticated;


-- ============================================================
-- FIX 2: get_client_reservations ne retourne aucun résultat
-- Cause : la vue all_reservations est soumise aux RLS de seat_reservations,
-- même quand appelée depuis une fonction SECURITY DEFINER.
-- Solution : requêter directement les tables au lieu de la vue.
-- ============================================================

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
    sr.id AS reservation_id,
    sr.seat_number,
    sr.status AS reservation_status,
    sr.passenger_name,
    sr.passenger_phone,
    sr.reserved_at,
    sr.booking_group_id,
    sr.booked_by_client_id,
    bg.booked_by_name,
    bg.booked_by_phone,
    st.id AS trip_id,
    st.departure_datetime,
    st.arrival_datetime,
    st.base_price AS price,
    st.status AS trip_status,
    r.departure_city,
    r.departure_location,
    r.arrival_city,
    r.arrival_location,
    a.name AS agency_name,
    a.color AS agency_color,
    EXTRACT(EPOCH FROM (st.arrival_datetime - st.departure_datetime)) / 3600 AS duration_hours,
    CASE 
      WHEN r.stops IS NULL OR jsonb_array_length(r.stops) = 0 THEN 'Direct'
      WHEN jsonb_array_length(r.stops) = 1 THEN '1 Arrêt'
      ELSE jsonb_array_length(r.stops)::TEXT || ' Arrêts'
    END AS trip_type,
    (sr.booked_by_client_id = p_client_id) AS is_main_booker
  FROM public.seat_reservations sr
  LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  JOIN public.routes r ON st.route_id = r.id
  JOIN public.buses b ON st.bus_id = b.id
  JOIN public.agencies a ON st.agency_id = a.id
  WHERE 
    sr.status IN ('reserve', 'confirme')
    AND (
      sr.booked_by_client_id = p_client_id
      OR sr.passenger_phone = p_phone
      OR bg.booked_by_phone = p_phone
    )
  ORDER BY sr.reserved_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_reservations TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_reservations TO authenticated;
