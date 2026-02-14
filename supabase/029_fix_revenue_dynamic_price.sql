-- ============================================================
-- YENDI - 029_fix_revenue_dynamic_price.sql
-- FIX: Les fonctions de stats et réservations utilisaient
-- toujours base_price au lieu du prix réellement payé
-- (booking_groups.unit_price) quand le yield management est actif
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- FIX 1: get_agency_reservation_stats
-- Le revenu journalier doit utiliser le prix réel payé
-- (booking_groups.unit_price) et non base_price
-- ════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.get_agency_reservation_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_agency_reservation_stats(p_agency_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH reservation_data AS (
    SELECT
      sr.reserved_at,
      -- Utiliser le prix dynamique (unit_price) s'il existe, sinon base_price
      COALESCE(bg.unit_price, st.base_price) AS actual_price,
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
      COALESCE(SUM(actual_price) FILTER (WHERE reserved_at::DATE = CURRENT_DATE), 0) AS today_revenue,
      COALESCE(SUM(actual_price) FILTER (WHERE reserved_at::DATE = CURRENT_DATE - 1), 0) AS yesterday_revenue,
      COUNT(*) FILTER (WHERE payment_method = 'mobile_money') AS mobile_money_count,
      COUNT(*) FILTER (WHERE payment_method = 'card') AS card_count
    FROM reservation_data
  ),
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

-- ════════════════════════════════════════════════════════════
-- FIX 2: get_agency_reservations
-- Le champ 'price' retourné doit être le prix réellement payé
-- (booking_groups.unit_price) et non base_price
-- ════════════════════════════════════════════════════════════
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
      'price', COALESCE(bg.unit_price, st.base_price),
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
