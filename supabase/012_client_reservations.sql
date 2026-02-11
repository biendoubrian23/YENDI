-- ============================================================
-- YENDI - 012_client_reservations.sql
-- Permettre aux clients de créer des réservations depuis l'app mobile
-- ============================================================

-- ═══ Politique INSERT pour seat_reservations ═══
-- Les utilisateurs publics peuvent insérer une réservation
-- sur un trajet actif et pour un siège disponible dans available_seat_numbers
DROP POLICY IF EXISTS "Public can insert seat_reservations" ON public.seat_reservations;
CREATE POLICY "Public can insert seat_reservations"
  ON public.seat_reservations FOR INSERT
  WITH CHECK (
    scheduled_trip_id IN (
      SELECT id FROM public.scheduled_trips WHERE status = 'actif'
    )
  );

-- ═══ Politique UPDATE pour seat_reservations ═══
-- Permettre de mettre à jour une réservation existante (ex: annuler)
DROP POLICY IF EXISTS "Public can update own seat_reservations" ON public.seat_reservations;
CREATE POLICY "Public can update own seat_reservations"
  ON public.seat_reservations FOR UPDATE
  USING (
    scheduled_trip_id IN (
      SELECT id FROM public.scheduled_trips WHERE status = 'actif'
    )
  );

-- ═══ Fonction RPC pour créer une réservation de manière atomique ═══
-- Cette fonction vérifie que le siège est disponible et crée la réservation
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_scheduled_trip_id UUID,
  p_seat_number INTEGER,
  p_passenger_name TEXT DEFAULT NULL,
  p_passenger_phone TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'mobile_money'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip RECORD;
  v_existing RECORD;
  v_reservation_id UUID;
  v_ticket_id TEXT;
BEGIN
  -- 1. Vérifier que le trajet existe et est actif
  SELECT id, available_seat_numbers, available_seats_count
  INTO v_trip
  FROM public.scheduled_trips
  WHERE id = p_scheduled_trip_id AND status = 'actif'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trajet non trouvé ou inactif');
  END IF;
  
  -- 2. Vérifier que le siège est dans les places disponibles
  IF NOT (p_seat_number = ANY(v_trip.available_seat_numbers)) THEN
    RETURN json_build_object('success', false, 'error', 'Ce siège n''est pas disponible à la vente');
  END IF;
  
  -- 3. Vérifier qu'il n'y a pas déjà une réservation confirmée pour ce siège
  SELECT id, status INTO v_existing
  FROM public.seat_reservations
  WHERE scheduled_trip_id = p_scheduled_trip_id AND seat_number = p_seat_number;
  
  IF FOUND AND v_existing.status IN ('reserve', 'confirme') THEN
    RETURN json_build_object('success', false, 'error', 'Ce siège est déjà réservé');
  END IF;
  
  -- 4. Générer un ID de ticket unique
  v_ticket_id := 'YD' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- 5. Créer ou mettre à jour la réservation
  IF FOUND THEN
    -- Mettre à jour la réservation existante (ex: était annulée)
    UPDATE public.seat_reservations
    SET status = 'confirme',
        passenger_name = COALESCE(p_passenger_name, passenger_name),
        passenger_phone = COALESCE(p_passenger_phone, passenger_phone),
        reserved_at = NOW()
    WHERE id = v_existing.id
    RETURNING id INTO v_reservation_id;
  ELSE
    -- Créer une nouvelle réservation
    INSERT INTO public.seat_reservations (
      scheduled_trip_id,
      seat_number,
      status,
      passenger_name,
      passenger_phone,
      reserved_at
    ) VALUES (
      p_scheduled_trip_id,
      p_seat_number,
      'confirme',
      p_passenger_name,
      p_passenger_phone,
      NOW()
    )
    RETURNING id INTO v_reservation_id;
  END IF;
  
  -- 6. Mettre à jour le compteur de places disponibles
  UPDATE public.scheduled_trips
  SET available_seats_count = available_seats_count - 1
  WHERE id = p_scheduled_trip_id AND available_seats_count > 0;
  
  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'ticket_id', v_ticket_id,
    'seat_number', p_seat_number
  );
END;
$$;

-- Donner accès à la fonction aux utilisateurs anonymes
GRANT EXECUTE ON FUNCTION public.create_reservation TO anon;
GRANT EXECUTE ON FUNCTION public.create_reservation TO authenticated;
