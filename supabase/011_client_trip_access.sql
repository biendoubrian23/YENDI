-- ============================================================
-- YENDI - 011_client_trip_access.sql
-- Donner accès en lecture aux clients pour chercher des trajets
-- ============================================================
-- NOTE : Exécuter dans le SQL Editor de Supabase
-- Si une policy existe déjà, on la supprime d'abord (DROP IF EXISTS)

-- ═══ 1. ROUTES ═══
DROP POLICY IF EXISTS "Authenticated users can view active routes" ON public.routes;
DROP POLICY IF EXISTS "Public can view active routes" ON public.routes;
CREATE POLICY "Public can view active routes"
  ON public.routes FOR SELECT
  USING (is_active = true);

-- ═══ 2. SCHEDULED_TRIPS ═══
DROP POLICY IF EXISTS "Authenticated users can view active scheduled_trips" ON public.scheduled_trips;
DROP POLICY IF EXISTS "Public can view active scheduled_trips" ON public.scheduled_trips;
CREATE POLICY "Public can view active scheduled_trips"
  ON public.scheduled_trips FOR SELECT
  USING (status = 'actif');

-- ═══ 3. BUSES (manquait !) ═══
DROP POLICY IF EXISTS "Public can view buses" ON public.buses;
CREATE POLICY "Public can view buses"
  ON public.buses FOR SELECT
  USING (true);

-- ═══ 4. AGENCIES (manquait !) ═══
DROP POLICY IF EXISTS "Public can view agencies" ON public.agencies;
CREATE POLICY "Public can view agencies"
  ON public.agencies FOR SELECT
  USING (true);

-- ═══ 5. SEAT_RESERVATIONS ═══
DROP POLICY IF EXISTS "Authenticated users can view seat_reservations" ON public.seat_reservations;
DROP POLICY IF EXISTS "Public can view seat_reservations" ON public.seat_reservations;
CREATE POLICY "Public can view seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (
    scheduled_trip_id IN (
      SELECT id FROM public.scheduled_trips WHERE status = 'actif'
    )
  );
