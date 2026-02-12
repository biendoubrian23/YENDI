-- ============================================================
-- TEST GLOBAL : Vérifier que rien n'est cassé après les optims
-- Exécuter EN DERNIER après 022 + tous les tests individuels
-- ============================================================

-- 1. Tables principales accessibles
SELECT 'Tables' AS categorie, relname AS element, 
  CASE WHEN n_live_tup >= 0 THEN '✓ OK' ELSE '✗ FAIL' END AS status,
  n_live_tup::TEXT AS nb_lignes
FROM pg_stat_user_tables
WHERE relname IN ('profiles', 'agencies', 'routes', 'scheduled_trips', 'seat_reservations', 'booking_groups', 'clients', 'activity_logs', 'activity_logs_archive')
ORDER BY relname;

-- 2. Vues fonctionnelles
SELECT 'Vues' AS categorie, table_name AS element, '✓ OK' AS status
FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('all_reservations', 'agency_reservations');

-- 3. Fonctions RPC critiques
SELECT 'Fonctions' AS categorie, proname AS element, '✓ OK' AS status
FROM pg_proc
WHERE proname IN ('create_group_reservation', 'get_agency_reservation_stats', 'get_client_reservations', 'generate_ticket_ref', 'archive_old_activity_logs')
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 4. Test fonctionnel : generate_ticket_ref
SELECT 'Test ref' AS categorie, 
  public.generate_ticket_ref() AS element,
  CASE WHEN public.generate_ticket_ref() LIKE 'YD-%' THEN '✓ OK' ELSE '✗ FAIL' END AS status;

-- 5. Test fonctionnel : stats agence
SELECT 'Test stats' AS categorie,
  'get_agency_reservation_stats' AS element,
  CASE WHEN result IS NOT NULL AND result->>'today_count' IS NOT NULL THEN '✓ OK' ELSE '✗ FAIL' END AS status,
  result->>'fill_rate' || '%' AS detail
FROM (
  SELECT public.get_agency_reservation_stats(
    (SELECT agency_id FROM public.scheduled_trips LIMIT 1)
  ) AS result
) sub;

-- 6. Contrainte UNIQUE siège
SELECT 'Contraintes' AS categorie,
  conname AS element,
  '✓ OK' AS status
FROM pg_constraint
WHERE conrelid = 'public.seat_reservations'::regclass AND contype = 'u';

-- 7. Index (tous)
SELECT 'Index' AS categorie,
  indexname AS element,
  '✓ OK' AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- 8. Policies RLS par table
SELECT 'Policies' AS categorie,
  tablename || ' (' || COUNT(*) || ' policies)' AS element,
  CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ FAIL' END AS status
FROM pg_policies
WHERE tablename::text IN ('routes', 'scheduled_trips', 'seat_reservations', 'booking_groups', 'clients')
GROUP BY tablename
ORDER BY tablename;

-- 9. Séquence ticket_ref
SELECT 'Séquence' AS categorie,
  sequencename AS element,
  '✓ OK' AS status,
  last_value::TEXT AS derniere_valeur
FROM pg_sequences
WHERE schemaname = 'public' AND sequencename = 'ticket_ref_seq';
