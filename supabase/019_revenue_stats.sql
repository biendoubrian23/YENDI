-- ============================================================
-- 019_revenue_stats.sql
-- Fonction pour récupérer les statistiques de revenus
-- ============================================================

DROP FUNCTION IF EXISTS public.get_agency_revenue_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_agency_revenue_stats(
  p_agency_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  day DATE,
  revenue BIGINT,
  reservations_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.reserved_at::DATE as day,
    SUM(st.base_price)::BIGINT as revenue,
    COUNT(*)::BIGINT as reservations_count
  FROM public.seat_reservations sr
  JOIN public.scheduled_trips st ON sr.scheduled_trip_id = st.id
  WHERE st.agency_id = p_agency_id
    AND sr.status = 'confirme'  -- Seulement les paiements confirmés
    AND sr.reserved_at >= p_start_date
    AND sr.reserved_at < p_end_date
  GROUP BY sr.reserved_at::DATE
  ORDER BY day ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_revenue_stats TO authenticated;

COMMENT ON FUNCTION public.get_agency_revenue_stats IS 
'Récupère les statistiques de revenus jour par jour pour une agence sur une période donnée.
Inclut uniquement les réservations confirmées (payées).';
