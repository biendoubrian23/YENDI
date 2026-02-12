-- ============================================================
-- YENDI - 023_fix_rls_recursion_trips.sql
-- FIX : Récursion infinie entre scheduled_trips ↔ seat_reservations
-- ============================================================
-- PROBLEME : La policy "Clients can view own booked trips" sur scheduled_trips
-- fait SELECT dans seat_reservations, dont les policies font SELECT dans
-- scheduled_trips → boucle infinie (erreur 42P17)
--
-- SOLUTION : Remplacer par une fonction SECURITY DEFINER qui bypass la RLS
-- ============================================================

-- 1. Créer la fonction helper SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.client_has_booking_on_trip(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seat_reservations
    WHERE scheduled_trip_id = p_trip_id
      AND booked_by_client_id = auth.uid()
      AND status IN ('reserve', 'confirme')
  );
$$;

-- 2. Supprimer l'ancienne policy qui cause la récursion
DROP POLICY IF EXISTS "Clients can view own booked trips" ON public.scheduled_trips;

-- 3. Recréer la policy en utilisant la fonction SECURITY DEFINER
CREATE POLICY "Clients can view own booked trips"
  ON public.scheduled_trips FOR SELECT
  USING (public.client_has_booking_on_trip(id));

-- ============================================================
-- La fonction SECURITY DEFINER contourne la RLS sur seat_reservations,
-- ce qui casse le cycle de récursion.
-- Le client peut voir :
--   - Les trajets actifs (via "Public can view active scheduled_trips")
--   - Les trajets où il a reservé (via cette policy)
-- ============================================================
