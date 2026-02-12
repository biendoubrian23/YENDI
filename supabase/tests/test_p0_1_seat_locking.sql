-- ============================================================
-- TEST P0-1 : Verrouillage par siège
-- Exécuter APRÈS 022_performance_optimizations.sql
-- ============================================================
-- Résultats visibles dans le SQL Editor de Supabase
-- ============================================================

-- Étape 1 : Récupérer un trajet actif pour le test
WITH test_setup AS (
  SELECT st.id AS trip_id, st.agency_id, st.available_seats_count, st.available_seat_numbers[1] AS first_seat
  FROM public.scheduled_trips st
  WHERE st.status = 'actif' AND st.available_seats_count > 2
  LIMIT 1
)
SELECT 
  'P0-1 Setup' AS test,
  CASE WHEN trip_id IS NOT NULL THEN '✓ READY' ELSE '⚠ SKIP - Aucun trajet actif avec >2 places' END AS status,
  trip_id::TEXT,
  available_seats_count::TEXT AS places_avant,
  first_seat::TEXT AS siege_test
FROM test_setup;

-- Étape 2 : Test réservation + vérification compteur + doublon
-- (exécuter séparément si Étape 1 retourne un trip_id)

DO $$
DECLARE
  v_trip_id UUID;
  v_seats_before INTEGER;
  v_first_seat INTEGER;
  v_result JSON;
  v_result2 JSON;
  v_seats_after INTEGER;
  v_booking_id UUID;
BEGIN
  -- Setup
  SELECT st.id, st.available_seats_count, st.available_seat_numbers[1]
  INTO v_trip_id, v_seats_before, v_first_seat
  FROM public.scheduled_trips st
  WHERE st.status = 'actif' AND st.available_seats_count > 2
  LIMIT 1;

  IF v_trip_id IS NULL THEN RETURN; END IF;

  -- Test 1 : Réservation normale
  v_result := public.create_group_reservation(
    p_scheduled_trip_id := v_trip_id,
    p_passengers := jsonb_build_array(
      jsonb_build_object('seat_number', v_first_seat, 'name', 'Test User P01', 'phone', '699999901')
    ),
    p_booked_by_name := 'Test User P01',
    p_booked_by_phone := '699999901',
    p_payment_method := 'mobile_money'
  );
  v_booking_id := (v_result->>'booking_group_id')::UUID;

  -- Vérifier le décrément
  SELECT available_seats_count INTO v_seats_after
  FROM public.scheduled_trips WHERE id = v_trip_id;

  -- Test 3 : Même siège → doit être rejeté (siège déjà pris)
  v_result2 := public.create_group_reservation(
    p_scheduled_trip_id := v_trip_id,
    p_passengers := jsonb_build_array(
      jsonb_build_object('seat_number', v_first_seat, 'name', 'Hacker', 'phone', '699999902')
    ),
    p_booked_by_name := 'Hacker',
    p_booked_by_phone := '699999902',
    p_payment_method := 'mobile_money'
  );

  -- Insérer les résultats dans une table temporaire pour SELECT
  CREATE TEMP TABLE IF NOT EXISTS _test_results (test TEXT, status TEXT, detail TEXT);
  DELETE FROM _test_results;

  INSERT INTO _test_results VALUES 
    ('P0-1.1 Réservation normale', 
     CASE WHEN (v_result->>'success')::BOOLEAN THEN '✓ PASS' ELSE '✗ FAIL' END,
     COALESCE('booking=' || (v_result->>'booking_group_id'), (v_result->>'error'))),
    ('P0-1.2 Compteur décrémenté',
     CASE WHEN v_seats_after = v_seats_before - 1 THEN '✓ PASS' ELSE '✗ FAIL' END,
     v_seats_before::TEXT || ' → ' || v_seats_after::TEXT || ' (attendu ' || (v_seats_before - 1)::TEXT || ')'),
    ('P0-1.3 Doublon siège rejeté',
     CASE WHEN NOT (v_result2->>'success')::BOOLEAN THEN '✓ PASS' ELSE '✗ FAIL' END,
     COALESCE((v_result2->>'error'), 'Pas rejeté !'));

  -- Cleanup
  DELETE FROM public.seat_reservations 
  WHERE scheduled_trip_id = v_trip_id AND passenger_phone IN ('699999901', '699999902');
  DELETE FROM public.booking_groups WHERE id = v_booking_id;
  IF (v_result2->>'booking_group_id') IS NOT NULL THEN
    DELETE FROM public.seat_reservations WHERE booking_group_id = (v_result2->>'booking_group_id')::UUID;
    DELETE FROM public.booking_groups WHERE id = (v_result2->>'booking_group_id')::UUID;
  END IF;
  UPDATE public.scheduled_trips SET available_seats_count = v_seats_before WHERE id = v_trip_id;
END;
$$;

-- Afficher les résultats
SELECT * FROM _test_results;
