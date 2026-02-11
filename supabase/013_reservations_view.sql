-- ============================================================
-- YENDI - 013_reservations_view.sql
-- Vue consolidée de toutes les réservations avec tous les détails
-- ============================================================

-- ═══ Vue: all_reservations ═══
-- Cette vue regroupe toutes les infos d'une réservation en un seul endroit
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
JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
JOIN public.routes r ON st.route_id = r.id
JOIN public.buses b ON st.bus_id = b.id
JOIN public.agencies a ON st.agency_id = a.id

ORDER BY sr.reserved_at DESC;

-- ═══ Donner accès à la vue ═══
GRANT SELECT ON public.all_reservations TO anon;
GRANT SELECT ON public.all_reservations TO authenticated;

-- ═══ Vue pour le dashboard agence: réservations de leur agence uniquement ═══
CREATE OR REPLACE VIEW public.agency_reservations AS
SELECT * FROM public.all_reservations
WHERE agency_id IN (
  SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
);

-- ═══ Politique RLS sur la vue (si nécessaire) ═══
-- Note: Les vues héritent des politiques RLS des tables sous-jacentes
-- Mais on peut aussi créer une fonction pour récupérer les réservations d'une agence

-- ═══ Fonction pour récupérer les réservations d'une agence ═══
CREATE OR REPLACE FUNCTION public.get_agency_reservations(p_agency_id UUID)
RETURNS TABLE (
  reservation_id UUID,
  seat_number INTEGER,
  reservation_status TEXT,
  passenger_name TEXT,
  passenger_phone TEXT,
  reserved_at TIMESTAMPTZ,
  trip_id UUID,
  departure_datetime TIMESTAMPTZ,
  arrival_datetime TIMESTAMPTZ,
  price INTEGER,
  driver_name TEXT,
  departure_city TEXT,
  departure_location TEXT,
  arrival_city TEXT,
  arrival_location TEXT,
  bus_brand TEXT,
  bus_model TEXT,
  bus_number TEXT,
  bus_plate TEXT,
  agency_name TEXT,
  trip_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    sr.id,
    sr.seat_number,
    sr.status,
    sr.passenger_name,
    sr.passenger_phone,
    sr.reserved_at,
    st.id,
    st.departure_datetime,
    st.arrival_datetime,
    st.base_price,
    st.driver_name,
    r.departure_city,
    r.departure_location,
    r.arrival_city,
    r.arrival_location,
    b.brand,
    b.model,
    b.number,
    b.plate,
    a.name,
    CASE 
      WHEN r.stops IS NULL OR jsonb_array_length(r.stops) = 0 THEN 'Direct'
      WHEN jsonb_array_length(r.stops) = 1 THEN '1 Arrêt'
      ELSE jsonb_array_length(r.stops)::TEXT || ' Arrêts'
    END
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  JOIN public.routes r ON st.route_id = r.id
  JOIN public.buses b ON st.bus_id = b.id
  JOIN public.agencies a ON st.agency_id = a.id
  WHERE a.id = p_agency_id
    AND sr.status IN ('reserve', 'confirme')
  ORDER BY sr.reserved_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_reservations TO authenticated;

-- ═══ Fonction pour les stats de réservation d'une agence ═══
CREATE OR REPLACE FUNCTION public.get_agency_reservation_stats(p_agency_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_reservations INTEGER;
  v_confirmed INTEGER;
  v_total_revenue BIGINT;
  v_today_reservations INTEGER;
BEGIN
  -- Total des réservations confirmées
  SELECT COUNT(*), COALESCE(SUM(st.base_price), 0)
  INTO v_confirmed, v_total_revenue
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme';
  
  -- Réservations du jour
  SELECT COUNT(*)
  INTO v_today_reservations
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'
    AND sr.reserved_at::DATE = CURRENT_DATE;
  
  RETURN json_build_object(
    'total_confirmed', v_confirmed,
    'total_revenue', v_total_revenue,
    'today_reservations', v_today_reservations
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_reservation_stats TO authenticated;
