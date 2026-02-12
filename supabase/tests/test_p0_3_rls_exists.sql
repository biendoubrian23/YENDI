-- ============================================================
-- TEST P0-3 : Vérifier que les policies RLS utilisent EXISTS
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================

-- Test 1-6 : Vérifier que les nouvelles policies existent
SELECT 
  'P0-3.' || ROW_NUMBER() OVER () AS test,
  policyname AS policy_name,
  tablename AS table_name,
  '✓ PASS' AS status
FROM pg_policies
WHERE (policyname, tablename) IN (
  ('Agency admins can view own routes', 'routes'),
  ('Agency admins can view own scheduled_trips', 'scheduled_trips'),
  ('Agency admins can view own seat_reservations', 'seat_reservations'),
  ('Public can view seat_reservations', 'seat_reservations'),
  ('Clients can view own booked seat_reservations', 'seat_reservations'),
  ('Clients can view own phone seat_reservations', 'seat_reservations'),
  ('Clients can view own booked booking_groups', 'booking_groups'),
  ('Clients can view own phone booking_groups', 'booking_groups')
)
ORDER BY tablename, policyname;

-- Test 7 : L'ancienne policy OR ne doit plus exister
SELECT 
  'P0-3.7 Ancienne policy OR supprimée' AS test,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL - encore présente' END AS status
FROM pg_policies
WHERE policyname = 'Clients can view own seat_reservations' AND tablename = 'seat_reservations';

-- Résumé complet des policies par table
SELECT 
  tablename AS table_name,
  COUNT(*) AS nb_policies,
  string_agg(policyname, ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE tablename IN ('routes', 'scheduled_trips', 'seat_reservations', 'booking_groups')
GROUP BY tablename
ORDER BY tablename;
