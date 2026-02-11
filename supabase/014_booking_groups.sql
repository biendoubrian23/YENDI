-- ============================================================
-- YENDI - 014_booking_groups.sql
-- Système de groupes de réservation pour multi-passagers
-- Permet à un utilisateur de réserver plusieurs places pour différentes personnes
-- ============================================================

-- ═══ Table: booking_groups ═══
-- Regroupe toutes les réservations faites en une seule transaction
CREATE TABLE IF NOT EXISTS public.booking_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Qui a fait et payé la réservation
  booked_by_client_id UUID REFERENCES public.clients(id),
  booked_by_name TEXT NOT NULL,
  booked_by_phone TEXT NOT NULL,
  booked_by_email TEXT,
  
  -- Infos du trajet (pour référence rapide)
  scheduled_trip_id UUID NOT NULL REFERENCES public.scheduled_trips(id) ON DELETE CASCADE,
  
  -- Paiement
  payment_method TEXT NOT NULL DEFAULT 'mobile_money',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_reference TEXT,
  
  -- Montants
  total_passengers INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  
  -- Contrainte : total_amount = unit_price * total_passengers
  CONSTRAINT valid_total_amount CHECK (total_amount = unit_price * total_passengers)
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_booking_groups_client ON public.booking_groups(booked_by_client_id);
CREATE INDEX IF NOT EXISTS idx_booking_groups_trip ON public.booking_groups(scheduled_trip_id);
CREATE INDEX IF NOT EXISTS idx_booking_groups_phone ON public.booking_groups(booked_by_phone);
CREATE INDEX IF NOT EXISTS idx_booking_groups_created ON public.booking_groups(created_at DESC);

-- ═══ Modifier seat_reservations pour supporter les groupes ═══
-- Ajouter colonne booking_group_id
ALTER TABLE public.seat_reservations 
ADD COLUMN IF NOT EXISTS booking_group_id UUID REFERENCES public.booking_groups(id) ON DELETE CASCADE;

-- Ajouter colonne booked_by_client_id (qui a payé)
ALTER TABLE public.seat_reservations 
ADD COLUMN IF NOT EXISTS booked_by_client_id UUID REFERENCES public.clients(id);

-- Ajouter index
CREATE INDEX IF NOT EXISTS idx_seat_reservations_booking_group ON public.seat_reservations(booking_group_id);
CREATE INDEX IF NOT EXISTS idx_seat_reservations_booked_by ON public.seat_reservations(booked_by_client_id);

-- ═══ RLS pour booking_groups ═══
ALTER TABLE public.booking_groups ENABLE ROW LEVEL SECURITY;

-- Clients peuvent voir leurs propres groupes de réservation
CREATE POLICY "booking_groups_client_select"
  ON public.booking_groups FOR SELECT
  USING (booked_by_client_id = auth.uid() OR booked_by_phone IN (
    SELECT phone FROM public.clients WHERE id = auth.uid()
  ));

-- Clients peuvent créer des groupes de réservation
CREATE POLICY "booking_groups_client_insert"
  ON public.booking_groups FOR INSERT
  WITH CHECK (true);

-- Agences peuvent voir les réservations de leurs trajets
CREATE POLICY "booking_groups_agency_select"
  ON public.booking_groups FOR SELECT
  USING (
    scheduled_trip_id IN (
      SELECT st.id FROM public.scheduled_trips st
      JOIN public.agency_admins aa ON st.agency_id = aa.agency_id
      WHERE aa.profile_id = auth.uid()
    )
  );

-- Accès public (anon) pour créer des réservations
CREATE POLICY "booking_groups_anon_insert"
  ON public.booking_groups FOR INSERT
  TO anon
  WITH CHECK (true);

-- ═══ Fonction RPC améliorée pour créer une réservation groupée ═══
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
        'error', format('Le siège %s est déjà réservé', v_seat_number)
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
    'paid',  -- On considère payé immédiatement pour simplifier
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
    
    -- Supprimer une réservation annulée existante si présente
    DELETE FROM public.seat_reservations
    WHERE scheduled_trip_id = p_scheduled_trip_id 
      AND seat_number = v_seat_number 
      AND status = 'annule';
    
    -- Créer la réservation
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

-- Donner accès à la fonction
GRANT EXECUTE ON FUNCTION public.create_group_reservation TO anon;
GRANT EXECUTE ON FUNCTION public.create_group_reservation TO authenticated;

-- ═══ Mettre à jour la vue all_reservations ═══
DROP VIEW IF EXISTS public.agency_reservations;
DROP VIEW IF EXISTS public.all_reservations;

CREATE OR REPLACE VIEW public.all_reservations AS
SELECT
  -- Réservation
  sr.id AS reservation_id,
  sr.seat_number,
  sr.status AS reservation_status,
  sr.passenger_name,
  sr.passenger_phone,
  sr.reserved_at,
  sr.created_at AS reservation_created_at,
  sr.booking_group_id,
  sr.booked_by_client_id,
  
  -- Groupe de réservation
  bg.booked_by_name,
  bg.booked_by_phone,
  bg.total_passengers,
  bg.total_amount AS group_total_amount,
  bg.payment_status,
  
  -- Trajet planifié
  st.id AS trip_id,
  st.departure_datetime,
  st.arrival_datetime,
  st.base_price AS price,
  st.driver_name,
  st.status AS trip_status,
  st.total_seats,
  st.available_seats_count,
  
  -- Route (itinéraire)
  r.id AS route_id,
  r.departure_city,
  r.departure_location,
  r.arrival_city,
  r.arrival_location,
  r.stops,
  
  -- Bus
  b.id AS bus_id,
  b.brand AS bus_brand,
  b.model AS bus_model,
  b.number AS bus_number,
  b.plate AS bus_plate,
  b.seats AS bus_capacity,
  b.features AS bus_features,
  b.is_vip AS bus_is_vip,
  
  -- Agence
  a.id AS agency_id,
  a.name AS agency_name,
  a.city AS agency_city,
  a.color AS agency_color,
  
  -- Calculs pratiques
  EXTRACT(EPOCH FROM (st.arrival_datetime - st.departure_datetime)) / 3600 AS duration_hours,
  CASE 
    WHEN r.stops IS NULL OR jsonb_array_length(r.stops) = 0 THEN 'Direct'
    WHEN jsonb_array_length(r.stops) = 1 THEN '1 Arrêt'
    ELSE jsonb_array_length(r.stops)::TEXT || ' Arrêts'
  END AS trip_type

FROM public.seat_reservations sr
LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
JOIN public.routes r ON st.route_id = r.id
JOIN public.buses b ON st.bus_id = b.id
JOIN public.agencies a ON st.agency_id = a.id

ORDER BY sr.reserved_at DESC;

-- Donner accès à la vue
GRANT SELECT ON public.all_reservations TO anon;
GRANT SELECT ON public.all_reservations TO authenticated;

-- Vue pour le dashboard agence
CREATE OR REPLACE VIEW public.agency_reservations AS
SELECT * FROM public.all_reservations
WHERE agency_id IN (
  SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
);

-- ═══ Fonction pour récupérer les réservations d'un client ═══
-- Récupère toutes les réservations où le client est soit le passager, soit celui qui a réservé
CREATE OR REPLACE FUNCTION public.get_client_reservations(p_client_id UUID DEFAULT NULL, p_phone TEXT DEFAULT NULL)
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
    ar.reservation_id,
    ar.seat_number,
    ar.reservation_status,
    ar.passenger_name,
    ar.passenger_phone,
    ar.reserved_at,
    ar.booking_group_id,
    ar.booked_by_client_id,
    ar.booked_by_name,
    ar.trip_id,
    ar.departure_datetime,
    ar.arrival_datetime,
    ar.price,
    ar.trip_status,
    ar.departure_city,
    ar.departure_location,
    ar.arrival_city,
    ar.arrival_location,
    ar.agency_name,
    ar.agency_color,
    ar.duration_hours,
    ar.trip_type,
    (ar.booked_by_client_id = p_client_id) AS is_main_booker
  FROM public.all_reservations ar
  WHERE 
    ar.booked_by_client_id = p_client_id
    OR ar.booked_by_phone = p_phone
    OR ar.passenger_phone = p_phone
  ORDER BY ar.reserved_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_reservations TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_reservations TO authenticated;

COMMENT ON TABLE public.booking_groups IS 'Groupes de réservations - permet de regrouper plusieurs billets achetés ensemble';
COMMENT ON FUNCTION public.create_group_reservation IS 'Créer une réservation groupée pour plusieurs passagers en une seule transaction';
