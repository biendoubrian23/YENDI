-- ============================================================
-- YENDI - 022_performance_optimizations.sql
-- Optimisations pour supporter 200-300K utilisateurs
-- ============================================================
-- IMPORTANT: Exécuter APRÈS 021_fix_client_reservations_access.sql
-- Exécuter section par section dans le SQL Editor de Supabase
-- ============================================================


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P0-1 : VERROUILLAGE PAR SIÈGE AU LIEU DU TRAJET           ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Avant : FOR UPDATE sur scheduled_trips = 1 réservation à la fois par trajet
-- Après : ON CONFLICT sur UNIQUE(scheduled_trip_id, seat_number) = parallèle

-- La contrainte UNIQUE existe déjà (créée dans 008), on réécrit juste la fonction

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
  v_booking_group_id UUID;
  v_ticket_ref TEXT;
  v_ticket_refs TEXT[] := '{}';
  v_total_passengers INTEGER;
  v_unit_price INTEGER;
  v_seat_numbers INTEGER[] := '{}';
  v_passenger JSONB;
  v_seat_number INTEGER;
  v_inserted_count INTEGER := 0;
BEGIN
  -- 1. Lire le trajet SANS FOR UPDATE (pas de verrou global)
  SELECT id, available_seat_numbers, available_seats_count, base_price
  INTO v_trip
  FROM public.scheduled_trips
  WHERE id = p_scheduled_trip_id AND status = 'actif';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trajet non trouvé ou inactif');
  END IF;
  
  v_total_passengers := jsonb_array_length(p_passengers);
  v_unit_price := v_trip.base_price;
  
  -- 2. Vérifier capacité restante
  IF v_trip.available_seats_count < v_total_passengers THEN
    RETURN json_build_object('success', false, 'error', format('Seulement %s places disponibles', v_trip.available_seats_count));
  END IF;

  -- 3. Vérifier que tous les sièges sont dans la liste disponible
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
  LOOP
    v_seat_number := (v_passenger->>'seat_number')::INTEGER;
    IF NOT (v_seat_number = ANY(v_trip.available_seat_numbers)) THEN
      RETURN json_build_object('success', false, 'error', format('Le siège %s n''est pas disponible à la vente', v_seat_number));
    END IF;
    v_seat_numbers := array_append(v_seat_numbers, v_seat_number);
  END LOOP;
  
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
  
  -- 5. Insérer les réservations avec ON CONFLICT (verrou par siège)
  FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
  LOOP
    v_seat_number := (v_passenger->>'seat_number')::INTEGER;
    v_ticket_ref := generate_ticket_ref();
    v_ticket_refs := array_append(v_ticket_refs, v_ticket_ref);
    
    -- INSERT avec ON CONFLICT = si le siège est déjà pris, on skip
    INSERT INTO public.seat_reservations (
      scheduled_trip_id, seat_number, status,
      passenger_name, passenger_phone,
      booking_group_id, booked_by_client_id, ticket_ref, reserved_at
    ) VALUES (
      p_scheduled_trip_id, v_seat_number, 'confirme',
      v_passenger->>'name', v_passenger->>'phone',
      v_booking_group_id, p_booked_by_client_id, v_ticket_ref, NOW()
    )
    ON CONFLICT (scheduled_trip_id, seat_number) 
    DO UPDATE SET 
      status = 'confirme',
      passenger_name = EXCLUDED.passenger_name,
      passenger_phone = EXCLUDED.passenger_phone,
      booking_group_id = EXCLUDED.booking_group_id,
      booked_by_client_id = EXCLUDED.booked_by_client_id,
      ticket_ref = EXCLUDED.ticket_ref,
      reserved_at = NOW()
    WHERE seat_reservations.status IN ('disponible', 'annule');
    
    -- Vérifier si l'INSERT/UPDATE a réussi
    IF FOUND THEN
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;
  
  -- 6. Vérifier que tous les sièges ont été réservés
  IF v_inserted_count < v_total_passengers THEN
    -- Certains sièges étaient déjà pris → rollback via RAISE
    RAISE EXCEPTION 'SEATS_TAKEN:Certains sièges sont déjà réservés';
  END IF;
  
  -- 7. Décrémenter les places avec vérification
  UPDATE public.scheduled_trips
  SET available_seats_count = available_seats_count - v_total_passengers
  WHERE id = p_scheduled_trip_id AND available_seats_count >= v_total_passengers;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_SEATS:Plus assez de places disponibles';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'booking_group_id', v_booking_group_id,
    'ticket_ids', v_ticket_refs,
    'seat_numbers', v_seat_numbers,
    'total_passengers', v_total_passengers,
    'total_amount', v_unit_price * v_total_passengers
  );

EXCEPTION 
  WHEN OTHERS THEN
    -- Nettoyer le booking_group si créé
    IF v_booking_group_id IS NOT NULL THEN
      DELETE FROM public.seat_reservations WHERE booking_group_id = v_booking_group_id;
      DELETE FROM public.booking_groups WHERE id = v_booking_group_id;
    END IF;
    
    -- Retourner l'erreur proprement
    IF SQLERRM LIKE 'SEATS_TAKEN:%' THEN
      RETURN json_build_object('success', false, 'error', split_part(SQLERRM, ':', 2), 'conflict_seats', v_seat_numbers);
    ELSIF SQLERRM LIKE 'NO_SEATS:%' THEN
      RETURN json_build_object('success', false, 'error', split_part(SQLERRM, ':', 2));
    ELSE
      RETURN json_build_object('success', false, 'error', 'Erreur interne: ' || SQLERRM);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_reservation TO anon;
GRANT EXECUTE ON FUNCTION public.create_group_reservation TO authenticated;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P0-2 : AJOUTER LES INDEX MANQUANTS                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Index sur passenger_phone (utilisé dans RLS et get_client_reservations)
CREATE INDEX IF NOT EXISTS idx_seatres_passenger_phone 
  ON public.seat_reservations(passenger_phone) 
  WHERE passenger_phone IS NOT NULL;

-- Index composite (status, id) sur scheduled_trips pour la RLS publique
CREATE INDEX IF NOT EXISTS idx_strips_status_id 
  ON public.scheduled_trips(status, id);

-- Index composite pour lookup rapide booked_by_client_id + trip
CREATE INDEX IF NOT EXISTS idx_seatres_booked_by_client 
  ON public.seat_reservations(booked_by_client_id) 
  WHERE booked_by_client_id IS NOT NULL;

-- Index sur wallet_transactions pour historique client
CREATE INDEX IF NOT EXISTS idx_wallet_tx_client_created 
  ON public.wallet_transactions(client_id, created_at DESC);

-- Index sur referred_by pour les cascades
CREATE INDEX IF NOT EXISTS idx_clients_referred_by 
  ON public.clients(referred_by) 
  WHERE referred_by IS NOT NULL;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P0-3 : CONVERTIR IN(SELECT...) → EXISTS DANS LES POLICIES ║
-- ╚══════════════════════════════════════════════════════════════╝
-- EXISTS permet à Postgres d'utiliser des index lookups au lieu de matérialiser des listes

-- ─── ROUTES (4 policies) ───
DROP POLICY IF EXISTS "Agency admins can view own routes" ON public.routes;
CREATE POLICY "Agency admins can view own routes"
  ON public.routes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = routes.agency_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can insert own routes" ON public.routes;
CREATE POLICY "Agency admins can insert own routes"
  ON public.routes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = routes.agency_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can update own routes" ON public.routes;
CREATE POLICY "Agency admins can update own routes"
  ON public.routes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = routes.agency_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can delete own routes" ON public.routes;
CREATE POLICY "Agency admins can delete own routes"
  ON public.routes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = routes.agency_id AND profile_id = auth.uid()
  ));

-- ─── SCHEDULED_TRIPS (4 policies) ───
DROP POLICY IF EXISTS "Agency admins can view own scheduled_trips" ON public.scheduled_trips;
CREATE POLICY "Agency admins can view own scheduled_trips"
  ON public.scheduled_trips FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = scheduled_trips.agency_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can insert own scheduled_trips" ON public.scheduled_trips;
CREATE POLICY "Agency admins can insert own scheduled_trips"
  ON public.scheduled_trips FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = scheduled_trips.agency_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can update own scheduled_trips" ON public.scheduled_trips;
CREATE POLICY "Agency admins can update own scheduled_trips"
  ON public.scheduled_trips FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = scheduled_trips.agency_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can delete own scheduled_trips" ON public.scheduled_trips;
CREATE POLICY "Agency admins can delete own scheduled_trips"
  ON public.scheduled_trips FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agency_admins 
    WHERE agency_id = scheduled_trips.agency_id AND profile_id = auth.uid()
  ));

-- ─── SEAT_RESERVATIONS (3 policies admin → EXISTS avec JOIN direct) ───
DROP POLICY IF EXISTS "Agency admins can view own seat_reservations" ON public.seat_reservations;
CREATE POLICY "Agency admins can view own seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.scheduled_trips st
    JOIN public.agency_admins aa ON st.agency_id = aa.agency_id
    WHERE st.id = seat_reservations.scheduled_trip_id
      AND aa.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can insert own seat_reservations" ON public.seat_reservations;
CREATE POLICY "Agency admins can insert own seat_reservations"
  ON public.seat_reservations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scheduled_trips st
    JOIN public.agency_admins aa ON st.agency_id = aa.agency_id
    WHERE st.id = seat_reservations.scheduled_trip_id
      AND aa.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agency admins can update own seat_reservations" ON public.seat_reservations;
CREATE POLICY "Agency admins can update own seat_reservations"
  ON public.seat_reservations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.scheduled_trips st
    JOIN public.agency_admins aa ON st.agency_id = aa.agency_id
    WHERE st.id = seat_reservations.scheduled_trip_id
      AND aa.profile_id = auth.uid()
  ));

-- ─── SEAT_RESERVATIONS : policy publique (EXISTS au lieu de IN) ───
DROP POLICY IF EXISTS "Public can view seat_reservations" ON public.seat_reservations;
CREATE POLICY "Public can view seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.scheduled_trips 
    WHERE id = seat_reservations.scheduled_trip_id AND status = 'actif'
  ));

-- ─── SEAT_RESERVATIONS : policy client INSERT/UPDATE ───
DROP POLICY IF EXISTS "Public can insert seat_reservations" ON public.seat_reservations;
CREATE POLICY "Public can insert seat_reservations"
  ON public.seat_reservations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scheduled_trips 
    WHERE id = seat_reservations.scheduled_trip_id AND status = 'actif'
  ));

DROP POLICY IF EXISTS "Public can update own seat_reservations" ON public.seat_reservations;
CREATE POLICY "Public can update own seat_reservations"
  ON public.seat_reservations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.scheduled_trips 
    WHERE id = seat_reservations.scheduled_trip_id AND status = 'actif'
  ));

-- ─── SCHEDULED_TRIPS : policy client pour trajets réservés (EXISTS) ───
DROP POLICY IF EXISTS "Clients can view own booked trips" ON public.scheduled_trips;
CREATE POLICY "Clients can view own booked trips"
  ON public.scheduled_trips FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seat_reservations
    WHERE scheduled_trip_id = scheduled_trips.id
      AND booked_by_client_id = auth.uid()
  ));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P1-1 : CONSOLIDER get_agency_reservation_stats             ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Avant : 6 SELECT séparés → Après : 1 seule requête

DROP FUNCTION IF EXISTS public.get_agency_reservation_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_agency_reservation_stats(p_agency_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH reservation_data AS (
    SELECT
      sr.reserved_at,
      st.base_price,
      st.total_seats,
      st.available_seats_count,
      st.status AS trip_status,
      bg.payment_method
    FROM public.seat_reservations sr
    JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
    LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
    WHERE st.agency_id = p_agency_id
      AND sr.status IN ('reserve', 'confirme')
  ),
  counts AS (
    SELECT
      COUNT(*) FILTER (WHERE reserved_at::DATE = CURRENT_DATE) AS today_count,
      COUNT(*) FILTER (WHERE reserved_at::DATE = CURRENT_DATE - 1) AS yesterday_count,
      COALESCE(SUM(base_price) FILTER (WHERE reserved_at::DATE = CURRENT_DATE), 0) AS today_revenue,
      COALESCE(SUM(base_price) FILTER (WHERE reserved_at::DATE = CURRENT_DATE - 1), 0) AS yesterday_revenue,
      COUNT(*) FILTER (WHERE payment_method = 'mobile_money') AS mobile_money_count,
      COUNT(*) FILTER (WHERE payment_method = 'card') AS card_count
    FROM reservation_data
  ),
  fill AS (
    SELECT
      COALESCE(SUM(total_seats), 0) AS total_seats,
      COALESCE(SUM(total_seats - available_seats_count), 0) AS occupied_seats
    FROM public.scheduled_trips
    WHERE agency_id = p_agency_id AND status = 'actif'
  )
  SELECT json_build_object(
    'today_count', c.today_count,
    'yesterday_count', c.yesterday_count,
    'today_revenue', c.today_revenue,
    'yesterday_revenue', c.yesterday_revenue,
    'total_seats', f.total_seats,
    'occupied_seats', f.occupied_seats,
    'fill_rate', CASE WHEN f.total_seats > 0 THEN ROUND((f.occupied_seats::NUMERIC / f.total_seats) * 100) ELSE 0 END,
    'mobile_money_count', c.mobile_money_count,
    'card_count', c.card_count
  )
  FROM counts c, fill f;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_reservation_stats TO authenticated;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P1-2 : ARCHIVAGE ACTIVITY_LOGS (TTL + index partiel)      ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Supabase ne supporte pas le partitionnement natif facilement,
-- on utilise une approche plus simple : archivage + cleanup.

-- Table d'archivage
CREATE TABLE IF NOT EXISTS public.activity_logs_archive (
  LIKE public.activity_logs INCLUDING ALL
);

-- Fonction de nettoyage : archive les logs > 3 mois
CREATE OR REPLACE FUNCTION public.archive_old_activity_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archived INTEGER;
BEGIN
  -- Déplacer les vieux logs dans l'archive
  WITH moved AS (
    DELETE FROM public.activity_logs
    WHERE created_at < NOW() - INTERVAL '3 months'
    RETURNING *
  )
  INSERT INTO public.activity_logs_archive SELECT * FROM moved;
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;
  RETURN v_archived;
END;
$$;

-- Index sur created_at pour accélérer les requêtes et l'archivage
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at 
  ON public.activity_logs(created_at DESC);

GRANT EXECUTE ON FUNCTION public.archive_old_activity_logs TO authenticated;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P2-1 : SÉQUENCE POUR TICKET_REF                           ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Avant : boucle LOOP + MD5 + SELECT EXISTS → collisions futures
-- Après : séquence + encodage base36 = garanti unique, pas de boucle

CREATE SEQUENCE IF NOT EXISTS public.ticket_ref_seq START WITH 100000;

CREATE OR REPLACE FUNCTION public.generate_ticket_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_num BIGINT;
  v_ref TEXT := '';
  v_chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  v_base INTEGER := 36;
  v_remainder INTEGER;
BEGIN
  v_num := nextval('public.ticket_ref_seq');
  
  -- Encoder en base36
  WHILE v_num > 0 LOOP
    v_remainder := (v_num % v_base)::INTEGER;
    v_ref := substr(v_chars, v_remainder + 1, 1) || v_ref;
    v_num := v_num / v_base;
  END LOOP;
  
  -- Préfixer avec YD et padding à 6 chars minimum
  RETURN 'YD-' || LPAD(v_ref, 4, '0');
END;
$$;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P2-2 : SCINDER POLICIES OR EN 2 POLICIES DISTINCTES       ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Postgres optimise mieux 2 policies séparées qu'une policy avec OR

-- seat_reservations : scinder la policy client
DROP POLICY IF EXISTS "Clients can view own seat_reservations" ON public.seat_reservations;

CREATE POLICY "Clients can view own booked seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (booked_by_client_id = auth.uid());

CREATE POLICY "Clients can view own phone seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (passenger_phone IN (
    SELECT phone FROM public.clients WHERE id = auth.uid() AND phone IS NOT NULL
  ));

-- booking_groups : scinder la policy client
DROP POLICY IF EXISTS "Clients can view own booking_groups" ON public.booking_groups;

CREATE POLICY "Clients can view own booked booking_groups"
  ON public.booking_groups FOR SELECT
  USING (booked_by_client_id = auth.uid());

CREATE POLICY "Clients can view own phone booking_groups"
  ON public.booking_groups FOR SELECT
  USING (booked_by_phone IN (
    SELECT phone FROM public.clients WHERE id = auth.uid() AND phone IS NOT NULL
  ));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  P2-3 : RÉVOQUER ACCÈS ANON SUR all_reservations           ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Les anonymes n'ont pas besoin de voir toutes les réservations
-- Les clients utilisent get_client_reservations (SECURITY DEFINER)

REVOKE SELECT ON public.all_reservations FROM anon;
-- Garder l'accès pour les utilisateurs authentifiés
-- GRANT SELECT ON public.all_reservations TO authenticated; -- déjà fait


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FIN DES OPTIMISATIONS                                      ║
-- ╚══════════════════════════════════════════════════════════════╝
