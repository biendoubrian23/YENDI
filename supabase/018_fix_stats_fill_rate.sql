-- ============================================================
-- 018_fix_stats_fill_rate.sql
-- Correction du calcul du taux de remplissage
-- ============================================================

-- Le taux de remplissage doit être calculé sur available_seats_count (places mises en vente)
-- et non sur total_seats (capacité totale du bus)

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
  v_total_seats_available INTEGER; -- Places mises en vente
  v_occupied_seats INTEGER; -- Places réservées
  v_mobile_money_count INTEGER;
  v_card_count INTEGER;
BEGIN
  -- Réservations aujourd'hui (UNIQUEMENT confirmées/payées)
  SELECT COUNT(*) INTO v_today_count
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'  -- Seulement les confirmées (payées)
    AND sr.reserved_at::DATE = CURRENT_DATE;

  -- Réservations hier (UNIQUEMENT confirmées/payées)
  SELECT COUNT(*) INTO v_yesterday_count
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'
    AND sr.reserved_at::DATE = CURRENT_DATE - 1;

  -- Revenus aujourd'hui (UNIQUEMENT confirmées)
  SELECT COALESCE(SUM(st.base_price), 0) INTO v_today_revenue
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'
    AND sr.reserved_at::DATE = CURRENT_DATE;

  -- Revenus hier (UNIQUEMENT confirmées)
  SELECT COALESCE(SUM(st.base_price), 0) INTO v_yesterday_revenue
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'
    AND sr.reserved_at::DATE = CURRENT_DATE - 1;

  -- Taux remplissage: basé sur available_seats_count (places mises en vente)
  -- Total des places mises en vente pour tous les trajets actifs
  SELECT COALESCE(SUM(st.available_seats_count), 0)
  INTO v_total_seats_available
  FROM public.scheduled_trips st
  WHERE st.agency_id = p_agency_id AND st.status = 'actif';

  -- Nombre de places réellement occupées (confirmées)
  SELECT COALESCE(COUNT(*), 0)
  INTO v_occupied_seats
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND st.status = 'actif'
    AND sr.status = 'confirme';

  -- Paiements Mobile Money (confirmés)
  SELECT COUNT(*) INTO v_mobile_money_count
  FROM public.seat_reservations sr
  JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'
    AND bg.payment_method = 'mobile_money';

  -- Paiements Carte (confirmés)
  SELECT COUNT(*) INTO v_card_count
  FROM public.seat_reservations sr
  JOIN public.booking_groups bg ON sr.booking_group_id = bg.id
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'
    AND bg.payment_method = 'card';

  RETURN json_build_object(
    'today_count', v_today_count,
    'yesterday_count', v_yesterday_count,
    'today_revenue', v_today_revenue,
    'yesterday_revenue', v_yesterday_revenue,
    'total_seats', v_total_seats_available,
    'occupied_seats', v_occupied_seats,
    'fill_rate', CASE WHEN v_total_seats_available > 0 THEN ROUND((v_occupied_seats::NUMERIC / v_total_seats_available) * 100) ELSE 0 END,
    'mobile_money_count', v_mobile_money_count,
    'card_count', v_card_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_reservation_stats TO authenticated;

COMMENT ON FUNCTION public.get_agency_reservation_stats IS 
'Calcule les statistiques de réservations pour une agence.
IMPORTANT: 
- Le taux de remplissage est basé sur available_seats_count (places mises en vente) et NON total_seats (capacité bus)
- Compte UNIQUEMENT les réservations confirmées (payées), pas celles en attente';

