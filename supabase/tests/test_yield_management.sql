-- ============================================================
-- TEST ÉPHÉMÈRE - Vérification complète Yield Management
-- Résultats visibles dans un tableau (compatible Supabase SQL Editor)
-- Ce script ne modifie rien de permanent
-- ============================================================

-- Table temporaire pour collecter les résultats
DROP TABLE IF EXISTS _test_results;
CREATE TEMP TABLE _test_results (
  test_num INTEGER,
  test_name TEXT,
  status TEXT,
  details TEXT
);

-- ═══ TEST 1: calculate_dynamic_price existe et fonctionne ═══
DO $$
DECLARE
  v_result JSONB;
  v_trip_id UUID;
BEGIN
  SELECT id INTO v_trip_id FROM public.scheduled_trips WHERE status = 'actif' LIMIT 1;

  IF v_trip_id IS NULL THEN
    INSERT INTO _test_results VALUES (1, 'calculate_dynamic_price existe', '⚠️ SKIP', 'Aucun trajet actif trouvé');
  ELSE
    v_result := public.calculate_dynamic_price(v_trip_id, NULL, NULL);
    IF v_result ? 'error' THEN
      INSERT INTO _test_results VALUES (1, 'calculate_dynamic_price existe', '❌ FAIL', 'Erreur: ' || (v_result->>'error'));
    ELSIF v_result ? 'base_price' AND v_result ? 'dynamic_price' AND v_result ? 'yield_enabled' THEN
      INSERT INTO _test_results VALUES (1, 'calculate_dynamic_price existe', '✅ OK',
        'base=' || (v_result->>'base_price') || ', dynamic=' || (v_result->>'dynamic_price') || ', yield=' || (v_result->>'yield_enabled'));
    ELSE
      INSERT INTO _test_results VALUES (1, 'calculate_dynamic_price existe', '❌ FAIL', 'Réponse inattendue: ' || v_result::TEXT);
    END IF;
  END IF;
END $$;

-- ═══ TEST 2: pricing_config pour chaque agence ═══
DO $$
DECLARE
  v_agencies INTEGER; v_configs INTEGER; v_enabled INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_agencies FROM public.agencies;
  SELECT COUNT(*) INTO v_configs FROM public.pricing_config;
  SELECT COUNT(*) INTO v_enabled FROM public.pricing_config WHERE is_enabled = true;

  IF v_configs >= v_agencies THEN
    INSERT INTO _test_results VALUES (2, 'pricing_config par agence', '✅ OK',
      v_configs || '/' || v_agencies || ' configs, ' || v_enabled || ' activées');
  ELSE
    INSERT INTO _test_results VALUES (2, 'pricing_config par agence', '❌ FAIL',
      v_configs || ' configs pour ' || v_agencies || ' agences');
  END IF;
END $$;

-- ═══ TEST 3: yield_enabled du trip est IGNORÉ ═══
DO $$
DECLARE
  v_result JSONB; v_trip RECORD;
BEGIN
  SELECT st.id AS trip_id, st.agency_id
  INTO v_trip
  FROM public.scheduled_trips st
  JOIN public.pricing_config pc ON pc.agency_id = st.agency_id
  WHERE st.status = 'actif' AND pc.is_enabled = true
  LIMIT 1;

  IF v_trip IS NULL THEN
    INSERT INTO _test_results VALUES (3, 'yield_enabled trip ignoré', '⚠️ SKIP', 'Aucune agence avec yield activé');
  ELSE
    v_result := public.calculate_dynamic_price(v_trip.trip_id, NULL, NULL);
    IF (v_result->>'yield_enabled')::BOOLEAN = true THEN
      INSERT INTO _test_results VALUES (3, 'yield_enabled trip ignoré', '✅ OK',
        'pricing_config.is_enabled respecté, trip.yield_enabled ignoré — base=' || (v_result->>'base_price') || ' dynamic=' || (v_result->>'dynamic_price'));
    ELSE
      INSERT INTO _test_results VALUES (3, 'yield_enabled trip ignoré', '❌ FAIL', 'yield_enabled=false malgré pricing_config.is_enabled=true');
    END IF;
  END IF;
END $$;

-- ═══ TEST 4: Détail des 4 facteurs ═══
DO $$
DECLARE
  v_result JSONB; v_factors JSONB; v_trip_id UUID; v_detail TEXT := '';
BEGIN
  SELECT st.id INTO v_trip_id
  FROM public.scheduled_trips st
  JOIN public.pricing_config pc ON pc.agency_id = st.agency_id
  WHERE st.status = 'actif' AND pc.is_enabled = true LIMIT 1;

  IF v_trip_id IS NULL THEN
    INSERT INTO _test_results VALUES (4, '4 facteurs pricing', '⚠️ SKIP', 'Pas de trajet avec pricing actif');
  ELSE
    v_result := public.calculate_dynamic_price(v_trip_id, NULL, NULL);
    v_factors := v_result->'factors';

    IF v_factors ? 'fill_rate' THEN
      v_detail := v_detail || 'A(FillRate):en=' || (v_factors->'fill_rate'->>'enabled') || ',fill=' || COALESCE(v_factors->'fill_rate'->>'fill_pct','?') || '%,bonus=' || COALESCE(v_factors->'fill_rate'->>'bonus','0') || ' | ';
    ELSE v_detail := v_detail || 'A:off | '; END IF;

    IF v_factors ? 'time_proximity' THEN
      v_detail := v_detail || 'B(Time):en=' || (v_factors->'time_proximity'->>'enabled') || ',h=' || COALESCE(v_factors->'time_proximity'->>'hours_left','?') || ',bonus=' || COALESCE(v_factors->'time_proximity'->>'bonus','0') || ' | ';
    ELSE v_detail := v_detail || 'B:off | '; END IF;

    IF v_factors ? 'demand' THEN
      v_detail := v_detail || 'C(Demand):en=' || (v_factors->'demand'->>'enabled') || ',bonus=' || COALESCE(v_factors->'demand'->>'bonus','0') || ' | ';
    ELSE v_detail := v_detail || 'C:off | '; END IF;

    IF v_factors ? 'velocity' THEN
      v_detail := v_detail || 'D(Velocity):en=' || (v_factors->'velocity'->>'enabled') || ',sales3h=' || COALESCE(v_factors->'velocity'->>'sales_3h','0') || ',bonus=' || COALESCE(v_factors->'velocity'->>'bonus','0');
    ELSE v_detail := v_detail || 'D:off'; END IF;

    INSERT INTO _test_results VALUES (4, '4 facteurs pricing', '✅ OK', v_detail || ' | max=' || (v_result->>'max_price'));
  END IF;
END $$;

-- ═══ TEST 5: create_group_reservation avec p_unit_price ═══
DO $$
DECLARE v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_group_reservation'
    AND array_length(p.proargtypes, 1) = 8
  ) INTO v_exists;

  IF v_exists THEN
    INSERT INTO _test_results VALUES (5, 'create_group_reservation 8 params', '✅ OK', 'p_unit_price supporté');
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'create_group_reservation'
    ) INTO v_exists;
    IF v_exists THEN
      INSERT INTO _test_results VALUES (5, 'create_group_reservation 8 params', '❌ FAIL', 'Fonction existe mais sans p_unit_price — Exécuter 028 FIX 2');
    ELSE
      INSERT INTO _test_results VALUES (5, 'create_group_reservation 8 params', '❌ FAIL', 'Fonction inexistante!');
    END IF;
  END IF;
END $$;

-- ═══ TEST 6: Indexes de performance ═══
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_indexes
  WHERE schemaname = 'public' AND indexname IN (
    'idx_pricing_config_agency','idx_price_locks_user','idx_price_locks_device',
    'idx_price_locks_trip','idx_price_locks_expiry','idx_search_log_user',
    'idx_search_log_route','idx_seat_reservations_trip_status','idx_seat_reservations_reserved_at'
  );
  IF v_count >= 8 THEN
    INSERT INTO _test_results VALUES (6, 'Indexes performance', '✅ OK', v_count || '/9 indexes présents');
  ELSE
    INSERT INTO _test_results VALUES (6, 'Indexes performance', '⚠️ WARN', v_count || '/9 indexes — performances potentiellement dégradées');
  END IF;
END $$;

-- ═══ TEST 7: get_agency_reservations utilise COALESCE ═══
DO $$
DECLARE v_src TEXT;
BEGIN
  SELECT prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'get_agency_reservations'
  AND array_length(p.proargtypes, 1) = 8;

  IF v_src IS NULL THEN
    INSERT INTO _test_results VALUES (7, 'get_agency_reservations prix dynamique', '⚠️ SKIP', 'Pas encore mise à jour — Exécuter 029');
  ELSIF v_src LIKE '%COALESCE(bg.unit_price, st.base_price)%' THEN
    INSERT INTO _test_results VALUES (7, 'get_agency_reservations prix dynamique', '✅ OK', 'Utilise COALESCE(bg.unit_price, st.base_price)');
  ELSIF v_src LIKE '%st.base_price%' THEN
    INSERT INTO _test_results VALUES (7, 'get_agency_reservations prix dynamique', '❌ FAIL', 'Utilise encore st.base_price — Exécuter 029');
  ELSE
    INSERT INTO _test_results VALUES (7, 'get_agency_reservations prix dynamique', '⚠️ WARN', 'Structure inattendue');
  END IF;
END $$;

-- ═══ TEST 8: RLS sur pricing_config ═══
DO $$
DECLARE v_rls BOOLEAN; v_pol INTEGER;
BEGIN
  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE relname = 'pricing_config';
  SELECT COUNT(*) INTO v_pol FROM pg_policies WHERE tablename = 'pricing_config';

  IF v_rls AND v_pol >= 2 THEN
    INSERT INTO _test_results VALUES (8, 'RLS pricing_config', '✅ OK', 'RLS activé, ' || v_pol || ' policies');
  ELSE
    INSERT INTO _test_results VALUES (8, 'RLS pricing_config', '❌ FAIL', 'enabled=' || v_rls::TEXT || ', policies=' || v_pol);
  END IF;
END $$;

-- ═══ TEST 9: Trigger auto_create_pricing_config ═══
DO $$
DECLARE v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_agency_created_pricing' AND event_object_table = 'agencies'
  ) INTO v_exists;

  IF v_exists THEN
    INSERT INTO _test_results VALUES (9, 'Trigger auto pricing_config', '✅ OK', 'Nouvelles agences auront auto une pricing_config');
  ELSE
    INSERT INTO _test_results VALUES (9, 'Trigger auto pricing_config', '❌ FAIL', 'Trigger on_agency_created_pricing manquant');
  END IF;
END $$;

-- ═══ TEST 10: Simulation complète de prix ═══
DO $$
DECLARE
  v_trip RECORD; v_result JSONB;
  v_base INTEGER; v_dynamic INTEGER; v_max INTEGER;
BEGIN
  SELECT st.id, st.base_price, st.agency_id INTO v_trip
  FROM public.scheduled_trips st
  JOIN public.pricing_config pc ON pc.agency_id = st.agency_id
  WHERE st.status = 'actif' AND pc.is_enabled = true LIMIT 1;

  IF v_trip IS NULL THEN
    INSERT INTO _test_results VALUES (10, 'Simulation prix dynamique', '⚠️ SKIP', 'Pas de trajet avec yield actif');
    RETURN;
  END IF;

  v_result := public.calculate_dynamic_price(v_trip.id, NULL, NULL);
  v_base := (v_result->>'base_price')::INTEGER;
  v_dynamic := (v_result->>'dynamic_price')::INTEGER;
  v_max := (v_result->>'max_price')::INTEGER;

  IF v_dynamic < v_base THEN
    INSERT INTO _test_results VALUES (10, 'Simulation prix dynamique', '❌ FAIL', 'dynamic(' || v_dynamic || ') < base(' || v_base || ')');
  ELSIF v_dynamic > v_max THEN
    INSERT INTO _test_results VALUES (10, 'Simulation prix dynamique', '❌ FAIL', 'dynamic(' || v_dynamic || ') > max(' || v_max || ')');
  ELSE
    IF v_dynamic > v_base THEN
      INSERT INTO _test_results VALUES (10, 'Simulation prix dynamique', '✅ OK',
        'base=' || v_base || ' → dynamic=' || v_dynamic || ' (max=' || v_max || ') +' || (v_dynamic - v_base) || ' FCFA (+' || ROUND(((v_dynamic - v_base)::NUMERIC / v_base) * 100) || '%)');
    ELSE
      INSERT INTO _test_results VALUES (10, 'Simulation prix dynamique', '✅ OK',
        'base=' || v_base || ' = dynamic=' || v_dynamic || ' (max=' || v_max || ') — bonus=0 (normal si bus vide/loin du départ)');
    END IF;
  END IF;
END $$;

-- ═══ RÉSULTATS FINAUX ═══
SELECT
  test_num AS "#",
  test_name AS "Test",
  status AS "Résultat",
  details AS "Détails"
FROM _test_results
ORDER BY test_num;

DROP TABLE IF EXISTS _test_results;
