-- ============================================================
-- TEST P2-3 : Accès anon révoqué sur all_reservations
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================

-- Test 1 : anon n'a plus accès SELECT
SELECT 
  'P2-3.1 Anon révoqué' AS test,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL - anon a encore accès' END AS status
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_name = 'all_reservations'
  AND privilege_type = 'SELECT';

-- Test 2 : authenticated a toujours accès
SELECT 
  'P2-3.2 Authenticated conservé' AS test,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL - authenticated a perdu accès' END AS status
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_name = 'all_reservations'
  AND privilege_type = 'SELECT';

-- Test 3 : get_client_reservations existe toujours
SELECT 
  'P2-3.3 Fonction client_reservations' AS test,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM pg_proc WHERE proname = 'get_client_reservations';
