-- =====================================================
-- 024 : Système d'annulation, séparation wallet, parrainage 200 FCFA
-- =====================================================

-- 1. Ajouter refund_balance sur clients (séparé du bonus parrainage)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS refund_balance INTEGER DEFAULT 0;

-- 2. Ajouter le type 'refund' aux wallet_transactions
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type IN ('referral_bonus', 'referral_reward', 'booking_credit', 'admin_credit', 'debit', 'refund'));

-- 3. Le statut 'annule' est déjà dans la contrainte CHECK de seat_reservations (depuis 008)
-- Rien à modifier ici.

-- =====================================================
-- 4. Fonction d'annulation de réservation avec remboursement gradué
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
  v_trip RECORD;
  v_client_id UUID;
  v_days_before NUMERIC;
  v_refund_percent INTEGER;
  v_refund_amount INTEGER;
  v_original_price INTEGER;
BEGIN
  -- Récupérer l'utilisateur courant
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer la réservation avec verrouillage
  SELECT sr.*, st.departure_datetime, st.arrival_datetime, st.available_seats_count,
         st.available_seat_numbers, st.id as trip_id, st.base_price
  INTO v_reservation
  FROM seat_reservations sr
  JOIN scheduled_trips st ON st.id = sr.scheduled_trip_id
  WHERE sr.id = p_reservation_id
    AND sr.booked_by_client_id = v_client_id
  FOR UPDATE OF sr, st;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Réservation introuvable ou non autorisée');
  END IF;

  -- Vérifier que la réservation n'est pas déjà annulée
  IF v_reservation.status = 'annule' THEN
    RETURN json_build_object('success', false, 'error', 'Cette réservation est déjà annulée');
  END IF;

  -- Vérifier que la réservation n'est pas pour un trajet passé
  IF v_reservation.departure_datetime < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Impossible d''annuler un trajet déjà passé');
  END IF;

  -- Calculer le nombre de jours avant le départ
  v_days_before := EXTRACT(EPOCH FROM (v_reservation.departure_datetime - NOW())) / 86400.0;

  -- Appliquer la politique de remboursement
  IF v_days_before >= 7 THEN
    v_refund_percent := 100;
  ELSIF v_days_before >= 3 THEN
    v_refund_percent := 90;
  ELSE
    -- Moins de 3 jours (inclut moins de 24h)
    v_refund_percent := 70;
  END IF;

  -- Calculer le montant du remboursement (prix dans scheduled_trips.base_price)
  v_original_price := v_reservation.base_price;
  v_refund_amount := ROUND(v_original_price * v_refund_percent / 100.0);

  -- 1. Mettre à jour le statut de la réservation
  UPDATE seat_reservations 
  SET status = 'annule'
  WHERE id = p_reservation_id;

  -- 2. Libérer le siège : incrémenter les places disponibles
  UPDATE scheduled_trips
  SET available_seats_count = available_seats_count + 1,
      available_seat_numbers = array_append(available_seat_numbers, v_reservation.seat_number)
  WHERE id = v_reservation.trip_id;

  -- 3. Créditer le remboursement sur refund_balance du client
  UPDATE clients
  SET refund_balance = refund_balance + v_refund_amount
  WHERE id = v_client_id;

  -- 4. Enregistrer la transaction de remboursement
  INSERT INTO wallet_transactions (client_id, amount, type, description)
  VALUES (
    v_client_id,
    v_refund_amount,
    'refund',
    'Remboursement ' || v_refund_percent || '% - Annulation réservation'
  );

  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'refund_percent', v_refund_percent,
    'original_price', v_original_price,
    'days_before', ROUND(v_days_before, 1),
    'reservation_id', p_reservation_id
  );
END;
$$;

-- Autoriser l'appel par les clients authentifiés
GRANT EXECUTE ON FUNCTION cancel_reservation(UUID) TO authenticated;

-- =====================================================
-- 5. Fonction utilitaire pour calculer le % de remboursement (preview, pas d'action)
-- =====================================================
CREATE OR REPLACE FUNCTION get_cancellation_preview(
  p_reservation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
  v_client_id UUID;
  v_days_before NUMERIC;
  v_refund_percent INTEGER;
  v_refund_amount INTEGER;
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT st.base_price, st.departure_datetime
  INTO v_reservation
  FROM seat_reservations sr
  JOIN scheduled_trips st ON st.id = sr.scheduled_trip_id
  WHERE sr.id = p_reservation_id
    AND sr.booked_by_client_id = v_client_id
    AND sr.status IN ('reserve', 'confirme');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Réservation introuvable');
  END IF;

  v_days_before := EXTRACT(EPOCH FROM (v_reservation.departure_datetime - NOW())) / 86400.0;

  IF v_days_before >= 7 THEN
    v_refund_percent := 100;
  ELSIF v_days_before >= 3 THEN
    v_refund_percent := 90;
  ELSE
    v_refund_percent := 70;
  END IF;

  v_refund_amount := ROUND(v_reservation.base_price * v_refund_percent / 100.0);

  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'refund_percent', v_refund_percent,
    'original_price', v_reservation.base_price,
    'days_before', ROUND(v_days_before, 1),
    'departure_datetime', v_reservation.departure_datetime
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_cancellation_preview(UUID) TO authenticated;

-- =====================================================
-- 6. Mettre à jour le bonus parrainage : 500 → 200 FCFA
-- =====================================================
CREATE OR REPLACE FUNCTION apply_referral_bonus(
  p_new_client_id UUID,
  p_referral_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer RECORD;
  v_existing RECORD;
  v_bonus_amount INTEGER := 200; -- Changé de 500 à 200 FCFA
BEGIN
  -- Vérifier que le code existe
  SELECT id, full_name, referral_code INTO v_referrer
  FROM clients
  WHERE referral_code = p_referral_code
    AND status = 'actif';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code de parrainage invalide');
  END IF;

  -- Pas d'auto-parrainage
  IF v_referrer.id = p_new_client_id THEN
    RETURN json_build_object('success', false, 'error', 'Auto-parrainage non autorisé');
  END IF;

  -- Vérifier si déjà parrainé
  SELECT id INTO v_existing
  FROM clients
  WHERE id = p_new_client_id AND referred_by IS NOT NULL;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Ce client a déjà utilisé un code de parrainage');
  END IF;

  -- Créditer le bonus au filleul
  UPDATE clients SET balance = balance + v_bonus_amount WHERE id = p_new_client_id;
  INSERT INTO wallet_transactions (client_id, amount, type, description, related_client_id)
  VALUES (p_new_client_id, v_bonus_amount, 'referral_bonus', 'Bonus parrainage à l''inscription', v_referrer.id);

  -- Créditer le bonus au parrain
  UPDATE clients SET balance = balance + v_bonus_amount WHERE id = v_referrer.id;
  INSERT INTO wallet_transactions (client_id, amount, type, description, related_client_id)
  VALUES (v_referrer.id, v_bonus_amount, 'referral_reward', 'Récompense de parrainage', p_new_client_id);

  -- Marquer le parrainage
  UPDATE clients SET referred_by = v_referrer.id WHERE id = p_new_client_id;

  RETURN json_build_object(
    'success', true,
    'bonus', v_bonus_amount,
    'referrer_name', v_referrer.full_name
  );
END;
$$;

-- =====================================================
-- 7. Mettre à jour get_client_reservations pour inclure les réservations annulées
-- =====================================================
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
  WHERE sr.status IN ('reserve', 'confirme', 'annule')
    AND (
      sr.booked_by_client_id = p_client_id 
      OR sr.passenger_phone = p_phone 
      OR bg.booked_by_phone = p_phone
    )
  ORDER BY sr.reserved_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_reservations TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_reservations TO authenticated;

-- =====================================================
-- 8. Mettre à jour get_agency_reservations pour inclure les annulées
-- =====================================================
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
  SELECT COUNT(*) INTO v_total
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.routes r ON st.route_id = r.id
  WHERE st.agency_id = p_agency_id
    AND sr.status IN ('reserve', 'confirme', 'annule')
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
      AND sr.status IN ('reserve', 'confirme', 'annule')
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

-- =====================================================
-- 9. Politique RLS pour permettre aux clients de mettre à jour (annuler) leurs réservations
-- =====================================================
-- On utilise la fonction SECURITY DEFINER cancel_reservation donc pas besoin de
-- politique UPDATE supplémentaire, car cancel_reservation bypass les RLS.

-- =====================================================
-- RÉSUMÉ DES CHANGEMENTS
-- =====================================================
-- ✅ clients.refund_balance : nouveau champ pour stocker les remboursements (séparé de balance/parrainage)
-- ✅ wallet_transactions type 'refund' ajouté
-- ✅ cancel_reservation() : annule, libère le siège, calcule et verse le remboursement
-- ✅ get_cancellation_preview() : prévisualise le montant de remboursement sans annuler
-- ✅ apply_referral_bonus() : bonus réduit de 500 à 200 FCFA
-- ✅ Contrainte status inclut 'annule'
