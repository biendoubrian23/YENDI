-- ============================================================
-- TEST P0-2 : Vérifier que les index existent
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================

SELECT 
  'P0-2.' || ROW_NUMBER() OVER () AS test,
  indexname,
  CASE WHEN indexname IS NOT NULL THEN '✓ PASS' ELSE '✗ FAIL' END AS status,
  tablename AS table_name,
  indexdef AS definition
FROM pg_indexes
WHERE indexname IN (
  'idx_seatres_passenger_phone',
  'idx_strips_status_id',
  'idx_seatres_booked_by_client',
  'idx_wallet_tx_client_created',
  'idx_clients_referred_by',
  'idx_seatres_trip',
  'idx_seatres_status',
  'idx_strips_agency',
  'idx_strips_departure'
)
ORDER BY indexname;

-- Résumé : compter combien d'index attendus existent
SELECT 
  'P0-2 Résumé' AS test,
  CASE WHEN COUNT(*) >= 5 THEN '✓ PASS' ELSE '✗ FAIL' END AS status,
  COUNT(*) || '/5 nouveaux index trouvés' AS detail
FROM pg_indexes
WHERE indexname IN (
  'idx_seatres_passenger_phone',
  'idx_strips_status_id',
  'idx_seatres_booked_by_client',
  'idx_wallet_tx_client_created',
  'idx_clients_referred_by'
);
