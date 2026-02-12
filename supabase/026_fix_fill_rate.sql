-- ============================================================
-- 026_fix_fill_rate.sql
-- Correction du calcul du taux de remplissage
-- ============================================================
-- PROBLÈME : La version 022 utilisait total_seats (capacité bus)
--   au lieu des places réellement mises en vente.
--   De plus, elle comptait TOUS les trajets actifs, pas seulement ceux du jour.
--
-- CORRECTION :
--   - Places mises en vente = available_seats_count (restantes) + réservations actives
--   - Filtré aux trajets du jour uniquement (departure_datetime::DATE = CURRENT_DATE)
--   - Taux = places occupées / places mises en vente × 100

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
  -- Taux de remplissage : uniquement trajets du jour
  -- Pour chaque trajet : places mises en vente = remaining + booked
  fill AS (
    SELECT
      COALESCE(SUM(trip_stats.seats_for_sale), 0) AS total_seats,
      COALESCE(SUM(trip_stats.booked), 0) AS occupied_seats
    FROM (
      SELECT
        st.available_seats_count + COUNT(sr.id) AS seats_for_sale,
        COUNT(sr.id) AS booked
      FROM public.scheduled_trips st
      LEFT JOIN public.seat_reservations sr
        ON sr.scheduled_trip_id = st.id
        AND sr.status IN ('reserve', 'confirme')
      WHERE st.agency_id = p_agency_id
        AND st.status = 'actif'
        AND st.departure_datetime::DATE = CURRENT_DATE
      GROUP BY st.id, st.available_seats_count
    ) trip_stats
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

COMMENT ON FUNCTION public.get_agency_reservation_stats IS
'Statistiques de réservations pour une agence.
- Taux de remplissage basé sur les places MISES EN VENTE (pas la capacité du bus)
- Filtré aux trajets du JOUR uniquement
- Places mises en vente = available_seats_count (restantes) + réservations actives
- Seules les réservations reserve/confirme sont comptées';
