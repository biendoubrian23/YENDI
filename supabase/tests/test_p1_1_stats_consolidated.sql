-- ============================================================
-- TEST P1-1 : get_agency_reservation_stats consolidé
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================

-- Test 1 : Appeler la fonction et afficher le résultat
SELECT 
  'P1-1.1 Fonction stats' AS test,
  CASE WHEN result IS NOT NULL THEN '✓ PASS' ELSE '✗ FAIL - NULL' END AS status,
  result->>'today_count' AS today_count,
  result->>'yesterday_count' AS yesterday_count,
  result->>'today_revenue' AS today_revenue,
  result->>'yesterday_revenue' AS yesterday_revenue,
  result->>'total_seats' AS total_seats,
  result->>'occupied_seats' AS occupied_seats,
  result->>'fill_rate' AS fill_rate,
  result->>'mobile_money_count' AS mobile_money,
  result->>'card_count' AS card
FROM (
  SELECT public.get_agency_reservation_stats(
    (SELECT agency_id FROM public.scheduled_trips WHERE status = 'actif' LIMIT 1)
  ) AS result
) sub;

-- Test 2 : Vérifier les 9 champs
SELECT 
  'P1-1.2 Champs présents' AS test,
  CASE 
    WHEN result->>'today_count' IS NOT NULL 
     AND result->>'yesterday_count' IS NOT NULL
     AND result->>'today_revenue' IS NOT NULL
     AND result->>'yesterday_revenue' IS NOT NULL
     AND result->>'total_seats' IS NOT NULL
     AND result->>'occupied_seats' IS NOT NULL
     AND result->>'fill_rate' IS NOT NULL
     AND result->>'mobile_money_count' IS NOT NULL
     AND result->>'card_count' IS NOT NULL
    THEN '✓ PASS (9/9)'
    ELSE '✗ FAIL - champs manquants'
  END AS status
FROM (
  SELECT public.get_agency_reservation_stats(
    (SELECT agency_id FROM public.scheduled_trips WHERE status = 'actif' LIMIT 1)
  ) AS result
) sub;

-- Test 3 : Valeurs cohérentes
SELECT 
  'P1-1.3 Valeurs cohérentes' AS test,
  CASE 
    WHEN (result->>'today_count')::INT >= 0 
     AND (result->>'fill_rate')::INT BETWEEN 0 AND 100
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  'fill_rate=' || (result->>'fill_rate') || '%, today=' || (result->>'today_count') AS detail
FROM (
  SELECT public.get_agency_reservation_stats(
    (SELECT agency_id FROM public.scheduled_trips WHERE status = 'actif' LIMIT 1)
  ) AS result
) sub;
