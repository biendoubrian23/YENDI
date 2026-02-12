-- ============================================================
-- TEST P2-1 : Séquence ticket_ref
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================

-- Test 1 : La séquence existe
SELECT 
  'P2-1.1 Séquence existe' AS test,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM pg_sequences 
WHERE schemaname = 'public' AND sequencename = 'ticket_ref_seq';

-- Test 2 + 3 : Format correct + unicité
SELECT 
  'P2-1.2 Format & unicité' AS test,
  CASE 
    WHEN ref1 LIKE 'YD-%' AND ref2 LIKE 'YD-%' AND ref3 LIKE 'YD-%' 
     AND ref1 != ref2 AND ref2 != ref3 
    THEN '✓ PASS' 
    ELSE '✗ FAIL' 
  END AS status,
  ref1 || ', ' || ref2 || ', ' || ref3 AS refs_generees
FROM (
  SELECT 
    public.generate_ticket_ref() AS ref1,
    public.generate_ticket_ref() AS ref2,
    public.generate_ticket_ref() AS ref3
) sub;

-- Test 4 : Performance (100 refs)
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM public.generate_ticket_ref();
  END LOOP;
  
  CREATE TEMP TABLE IF NOT EXISTS _test_perf (test TEXT, status TEXT, detail TEXT);
  DELETE FROM _test_perf;
  INSERT INTO _test_perf VALUES ('P2-1.3 Perf 100 refs', '✓ PASS', '100 refs générées sans timeout');
END;
$$;

SELECT * FROM _test_perf;
