-- ============================================================
-- YENDI - 021_fix_client_reservations_access.sql
-- Corriger les politiques RLS pour que les clients voient toujours
-- leurs propres réservations, quel que soit le statut du trajet
-- ============================================================

-- ═══ 1. Ajouter une policy pour que les clients authentifiés voient leurs propres réservations ═══
-- La policy existante "Public can view seat_reservations" ne montre que les
-- réservations de trajets ACTIFS. Quand un trajet passe en 'termine' ou 'en_cours',
-- les billets disparaissent de l'écran "Mes Billets".

DROP POLICY IF EXISTS "Clients can view own seat_reservations" ON public.seat_reservations;
CREATE POLICY "Clients can view own seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (
    booked_by_client_id = auth.uid()
    OR passenger_phone IN (
      SELECT phone FROM public.clients WHERE id = auth.uid() AND phone IS NOT NULL
    )
  );

-- ═══ 2. Ajouter une policy similaire sur booking_groups ═══
-- Les clients doivent voir leurs propres groupes de réservation
DROP POLICY IF EXISTS "Clients can view own booking_groups" ON public.booking_groups;
CREATE POLICY "Clients can view own booking_groups"
  ON public.booking_groups FOR SELECT
  USING (
    booked_by_client_id = auth.uid()
    OR booked_by_phone IN (
      SELECT phone FROM public.clients WHERE id = auth.uid() AND phone IS NOT NULL
    )
  );

-- ═══ 3. Policy sur scheduled_trips pour que les clients voient aussi les trajets terminés ═══
-- (nécessaire pour le fallback et la vue all_reservations)
DROP POLICY IF EXISTS "Clients can view own booked trips" ON public.scheduled_trips;
CREATE POLICY "Clients can view own booked trips"
  ON public.scheduled_trips FOR SELECT
  USING (
    id IN (
      SELECT scheduled_trip_id FROM public.seat_reservations
      WHERE booked_by_client_id = auth.uid()
    )
  );

-- ═══ 4. Recréer la vue all_reservations avec les champs ticket_ref ═══
-- CASCADE nécessaire car agency_reservations dépend de all_reservations
DROP VIEW IF EXISTS public.all_reservations CASCADE;

CREATE OR REPLACE VIEW public.all_reservations AS
SELECT
  sr.id AS reservation_id,
  sr.seat_number,
  sr.status AS reservation_status,
  sr.passenger_name,
  sr.passenger_phone,
  sr.reserved_at,
  sr.booking_group_id,
  sr.booked_by_client_id,
  sr.ticket_ref,
  bg.booked_by_name,
  bg.booked_by_phone,
  st.id AS trip_id,
  st.departure_datetime,
  st.arrival_datetime,
  st.base_price AS price,
  st.status AS trip_status,
  st.agency_id,
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
  END AS trip_type
FROM public.seat_reservations sr
LEFT JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
JOIN public.routes r ON st.route_id = r.id
JOIN public.buses b ON st.bus_id = b.id
JOIN public.agencies a ON st.agency_id = a.id;

GRANT SELECT ON public.all_reservations TO anon;
GRANT SELECT ON public.all_reservations TO authenticated;

-- ═══ 4b. Recréer la vue agency_reservations (supprimée par CASCADE) ═══
CREATE OR REPLACE VIEW public.agency_reservations AS
SELECT * FROM public.all_reservations
WHERE agency_id IN (
  SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
);

-- ═══ 5. S'assurer que get_client_reservations est bien en SECURITY DEFINER ═══
-- (Réappliquer la version correcte de la migration 016 si jamais elle n'a pas été appliquée)
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
    AND (
      sr.booked_by_client_id = p_client_id 
      OR sr.passenger_phone = p_phone 
      OR bg.booked_by_phone = p_phone
    )
  ORDER BY sr.reserved_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_reservations TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_reservations TO authenticated;
