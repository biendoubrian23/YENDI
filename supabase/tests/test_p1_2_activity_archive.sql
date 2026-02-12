-- ============================================================
-- TEST P1-2 : Archivage activity_logs
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================

-- Test 1 : La table d'archive existe
SELECT 
  'P1-2.1 Table archive' AS test,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM information_schema.tables
WHERE table_name = 'activity_logs_archive' AND table_schema = 'public';

-- Test 2 : La fonction d'archivage existe
SELECT 
  'P1-2.2 Fonction archive' AS test,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM pg_proc WHERE proname = 'archive_old_activity_logs';

-- Test 3 : Exécuter la fonction d'archivage
SELECT 
  'P1-2.3 Exécution archivage' AS test,
  '✓ PASS' AS status,
  public.archive_old_activity_logs() || ' lignes archivées' AS detail;

-- Test 4 : L'index sur created_at existe
SELECT 
  'P1-2.4 Index created_at' AS test,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status,
  MAX(indexname) AS index_name
FROM pg_indexes
WHERE indexname = 'idx_activity_logs_created_at';

-- Test 5 : La table principale est accessible
SELECT 
  'P1-2.5 Table accessible' AS test,
  '✓ PASS' AS status,
  COUNT(*) || ' lignes' AS detail
FROM public.activity_logs;
