-- ============================================================
-- YENDI - 030_fix_countdown_persistent.sql
-- FIX: Countdown FOMO persistant et unique par utilisateur/trajet
-- 
-- Changements:
-- 1. Offset aléatoire ±25% sur la durée du countdown
--    → Chaque user+trip a un countdown différent (hash déterministe)
-- 2. ON CONFLICT corrigé pour device_id (users non connectés)
--    → Le countdown persiste même après déco/reco
-- 3. Nettoyage des anciens locks pour éviter les doublons
--
-- À EXÉCUTER dans le SQL Editor de Supabase
-- ============================================================

-- Nettoyer les anciens price_locks invalides (device_id NULL + user_id NULL)
DELETE FROM public.user_price_locks
WHERE user_id IS NULL AND device_id IS NULL;

-- Nettoyer les locks expirés de plus de 24h
DELETE FROM public.user_price_locks
WHERE is_expired = true AND countdown_end < NOW() - INTERVAL '24 hours';

-- Recréer la fonction avec les corrections countdown
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_trip_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip RECORD;
  v_config RECORD;
  v_base_price INTEGER;
  v_final_price INTEGER;
  v_fill_rate NUMERIC;
  v_hours_to_departure NUMERIC;
  v_factors JSONB := '{}';
  v_factor_a INTEGER := 0;
  v_factor_b INTEGER := 0;
  v_factor_c INTEGER := 0;
  v_factor_d INTEGER := 0;
  v_max_price INTEGER;
  v_price_step INTEGER;
  v_tier JSONB;
  v_countdown_end TIMESTAMPTZ;
  v_next_price INTEGER;
  v_lock RECORD;
  v_search_count INTEGER := 0;
  v_velocity INTEGER := 0;
  v_day_of_week INTEGER;
  v_hour_of_day INTEGER;
  v_countdown_enabled BOOLEAN := false;
  v_countdown_minutes INTEGER := 120;
  v_countdown_increase INTEGER := 300;
  v_countdown_offset INTEGER := 0;
BEGIN
  -- Récupérer le trajet
  SELECT st.*, r.departure_city, r.arrival_city
  INTO v_trip
  FROM public.scheduled_trips st
  JOIN public.routes r ON r.id = st.route_id
  WHERE st.id = p_trip_id;
  
  IF v_trip IS NULL THEN
    RETURN jsonb_build_object('error', 'Trip not found');
  END IF;
  
  v_base_price := v_trip.base_price;
  
  -- Récupérer la config pricing de l'agence
  SELECT * INTO v_config
  FROM public.pricing_config
  WHERE agency_id = v_trip.agency_id;
  
  -- Si pas de config ou désactivé → prix de base
  IF v_config IS NULL OR NOT v_config.is_enabled THEN
    RETURN jsonb_build_object(
      'base_price', v_base_price,
      'dynamic_price', v_base_price,
      'yield_enabled', false,
      'factors', '{}'::jsonb
    );
  END IF;
  
  v_price_step := v_config.price_step;
  v_max_price := FLOOR(v_base_price * v_config.max_price_multiplier);
  v_countdown_enabled := v_config.countdown_enabled;
  v_countdown_minutes := v_config.countdown_duration_minutes;
  v_countdown_increase := v_config.countdown_price_increase;
  
  -- ═══ OFFSET ALÉATOIRE ±25% ═══
  -- Hash déterministe basé sur device_id/user_id + trip_id
  -- Même user+trip = toujours le même offset (pas de reset à chaque appel)
  -- Différents users sur le même trip = offsets différents
  v_countdown_offset := (
    (abs(hashtext(COALESCE(p_device_id, p_user_id::TEXT, 'anon') || p_trip_id::TEXT)) % 51) - 25
  ) * v_countdown_minutes / 100;
  -- Ex: config=120min → offset entre -30 et +30 → countdown entre 90 et 150 min
  v_countdown_minutes := GREATEST(v_countdown_minutes + v_countdown_offset, 10);
  
  -- Calculer le taux de remplissage
  v_fill_rate := CASE 
    WHEN v_trip.total_seats = 0 THEN 0
    ELSE ((v_trip.total_seats - v_trip.available_seats_count)::NUMERIC / v_trip.total_seats) * 100
  END;
  
  -- Calculer les heures avant le départ
  v_hours_to_departure := EXTRACT(EPOCH FROM (v_trip.departure_datetime - NOW())) / 3600.0;
  IF v_hours_to_departure < 0 THEN v_hours_to_departure := 0; END IF;
  
  -- ═══ FACTEUR A : Taux de remplissage ═══
  IF v_config.factor_fill_rate_enabled THEN
    FOR v_tier IN SELECT * FROM jsonb_array_elements(v_config.factor_fill_rate_tiers)
    LOOP
      IF v_fill_rate >= (v_tier->>'min')::NUMERIC 
         AND v_fill_rate <= (v_tier->>'max')::NUMERIC THEN
        v_factor_a := FLOOR(v_base_price * ((v_tier->>'multiplier')::NUMERIC - 1.0));
        EXIT;
      END IF;
    END LOOP;
    v_factors := v_factors || jsonb_build_object('fill_rate', jsonb_build_object(
      'enabled', true, 'fill_pct', ROUND(v_fill_rate, 1), 'bonus', v_factor_a
    ));
  END IF;
  
  -- ═══ FACTEUR B : Proximité du départ ═══
  IF v_config.factor_time_proximity_enabled THEN
    IF v_fill_rate < 20 AND v_hours_to_departure < 5 THEN
      v_factor_b := 0;
    ELSE
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_config.factor_time_proximity_tiers)
      LOOP
        IF v_hours_to_departure >= (v_tier->>'hours_min')::NUMERIC 
           AND v_hours_to_departure < (v_tier->>'hours_max')::NUMERIC THEN
          v_factor_b := (v_tier->>'bonus')::INTEGER;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    v_factors := v_factors || jsonb_build_object('time_proximity', jsonb_build_object(
      'enabled', true, 'hours_left', ROUND(v_hours_to_departure, 1), 'bonus', v_factor_b
    ));
  END IF;
  
  -- ═══ FACTEUR C : Demande historique ═══
  IF v_config.factor_demand_enabled THEN
    v_day_of_week := EXTRACT(DOW FROM v_trip.departure_datetime)::INTEGER;
    v_hour_of_day := EXTRACT(HOUR FROM v_trip.departure_datetime)::INTEGER;
    
    IF v_day_of_week = ANY(
      ARRAY(SELECT jsonb_array_elements_text(v_config.factor_demand_config->'peak_days')::INTEGER)
    ) THEN
      v_factor_c := v_factor_c + COALESCE((v_config.factor_demand_config->>'peak_day_bonus')::INTEGER, 0);
    END IF;
    
    DECLARE
      v_peak_range JSONB;
      v_start_h INTEGER;
      v_end_h INTEGER;
    BEGIN
      FOR v_peak_range IN SELECT * FROM jsonb_array_elements(v_config.factor_demand_config->'peak_hours')
      LOOP
        v_start_h := (v_peak_range->>0)::INTEGER;
        v_end_h := (v_peak_range->>1)::INTEGER;
        IF v_hour_of_day >= v_start_h AND v_hour_of_day < v_end_h THEN
          v_factor_c := v_factor_c + COALESCE((v_config.factor_demand_config->>'peak_hour_bonus')::INTEGER, 0);
          EXIT;
        END IF;
      END LOOP;
    END;
    
    v_factors := v_factors || jsonb_build_object('demand', jsonb_build_object(
      'enabled', true, 'day', v_day_of_week, 'hour', v_hour_of_day, 'bonus', v_factor_c
    ));
  END IF;
  
  -- ═══ FACTEUR D : Vélocité de vente ═══
  IF v_config.factor_velocity_enabled THEN
    SELECT COUNT(*) INTO v_velocity
    FROM public.seat_reservations
    WHERE scheduled_trip_id = p_trip_id
      AND status IN ('reserve', 'confirme')
      AND reserved_at >= NOW() - INTERVAL '3 hours';
    
    IF v_velocity >= COALESCE((v_config.factor_velocity_config->>'high_velocity_threshold')::INTEGER, 5) THEN
      v_factor_d := COALESCE((v_config.factor_velocity_config->>'high_velocity_bonus')::INTEGER, 300);
    ELSIF v_velocity >= COALESCE((v_config.factor_velocity_config->>'medium_velocity_threshold')::INTEGER, 3) THEN
      v_factor_d := COALESCE((v_config.factor_velocity_config->>'medium_velocity_bonus')::INTEGER, 200);
    ELSIF v_velocity >= COALESCE((v_config.factor_velocity_config->>'low_velocity_threshold')::INTEGER, 1) THEN
      v_factor_d := COALESCE((v_config.factor_velocity_config->>'low_velocity_bonus')::INTEGER, 100);
    ELSIF v_velocity = 0 THEN
      v_factor_d := COALESCE((v_config.factor_velocity_config->>'zero_velocity_penalty')::INTEGER, -100);
    END IF;
    
    v_factors := v_factors || jsonb_build_object('velocity', jsonb_build_object(
      'enabled', true, 'sales_3h', v_velocity, 'bonus', v_factor_d
    ));
  END IF;
  
  -- ═══ CALCUL FINAL ═══
  v_final_price := v_base_price + v_factor_a + v_factor_b + v_factor_c + v_factor_d;
  
  -- Ne jamais descendre sous le prix de base
  IF v_final_price < v_base_price THEN
    v_final_price := v_base_price;
  END IF;
  
  -- Ne pas dépasser le prix max (plafond)
  IF v_final_price > v_max_price THEN
    v_final_price := v_max_price;
  END IF;
  
  -- Arrondir au palier
  v_final_price := FLOOR(v_final_price / v_price_step) * v_price_step;
  
  -- ═══ COUNTDOWN / PRICE LOCK (persistant) ═══
  v_countdown_end := NULL;
  v_next_price := v_final_price;
  
  IF v_countdown_enabled AND (p_user_id IS NOT NULL OR p_device_id IS NOT NULL) THEN
    -- Si user authentifié avec device_id, supprimer un éventuel lock anonyme
    -- pour éviter le conflit UNIQUE(device_id, trip_id) lors de l'INSERT
    IF p_user_id IS NOT NULL AND p_device_id IS NOT NULL THEN
      DELETE FROM public.user_price_locks
      WHERE device_id = p_device_id
        AND trip_id = p_trip_id
        AND user_id IS NULL;
    END IF;
    
    -- Chercher un lock existant (par user_id OU device_id)
    SELECT * INTO v_lock
    FROM public.user_price_locks
    WHERE trip_id = p_trip_id
      AND (
        (user_id = p_user_id AND p_user_id IS NOT NULL)
        OR (device_id = p_device_id AND p_device_id IS NOT NULL)
      )
      AND NOT is_expired
    LIMIT 1;
    
    IF v_lock IS NOT NULL THEN
      -- Lock existant trouvé
      IF v_lock.countdown_end > NOW() THEN
        -- Countdown encore actif → retourner les valeurs sauvegardées (PERSISTANT)
        v_final_price := v_lock.price_shown;
        v_countdown_end := v_lock.countdown_end;
        v_next_price := v_lock.next_price;
      ELSE
        -- Lock expiré → marquer comme expiré, augmenter le prix, nouveau countdown
        UPDATE public.user_price_locks
        SET is_expired = true
        WHERE id = v_lock.id;
        
        v_next_price := LEAST(
          v_final_price + v_countdown_increase,
          v_max_price
        );
        v_next_price := FLOOR(v_next_price / v_price_step) * v_price_step;
        v_countdown_end := NOW() + (v_countdown_minutes || ' minutes')::INTERVAL;
        
        IF p_user_id IS NOT NULL THEN
          INSERT INTO public.user_price_locks (user_id, device_id, trip_id, price_shown, next_price, countdown_end)
          VALUES (p_user_id, p_device_id, p_trip_id, v_final_price, v_next_price, v_countdown_end)
          ON CONFLICT (user_id, trip_id) DO UPDATE SET
            price_shown = EXCLUDED.price_shown,
            next_price = EXCLUDED.next_price,
            countdown_end = EXCLUDED.countdown_end,
            is_expired = false;
        ELSE
          INSERT INTO public.user_price_locks (device_id, trip_id, price_shown, next_price, countdown_end)
          VALUES (p_device_id, p_trip_id, v_final_price, v_next_price, v_countdown_end)
          ON CONFLICT (device_id, trip_id) DO UPDATE SET
            price_shown = EXCLUDED.price_shown,
            next_price = EXCLUDED.next_price,
            countdown_end = EXCLUDED.countdown_end,
            is_expired = false;
        END IF;
      END IF;
    ELSE
      -- Aucun lock → premier countdown pour cet user+trip
      v_next_price := LEAST(
        v_final_price + v_countdown_increase,
        v_max_price
      );
      v_next_price := FLOOR(v_next_price / v_price_step) * v_price_step;
      v_countdown_end := NOW() + (v_countdown_minutes || ' minutes')::INTERVAL;
      
      IF p_user_id IS NOT NULL THEN
        INSERT INTO public.user_price_locks (user_id, device_id, trip_id, price_shown, next_price, countdown_end)
        VALUES (p_user_id, p_device_id, p_trip_id, v_final_price, v_next_price, v_countdown_end)
        ON CONFLICT (user_id, trip_id) DO UPDATE SET
          price_shown = EXCLUDED.price_shown,
          next_price = EXCLUDED.next_price,
          countdown_end = EXCLUDED.countdown_end,
          is_expired = false;
      ELSE
        INSERT INTO public.user_price_locks (device_id, trip_id, price_shown, next_price, countdown_end)
        VALUES (p_device_id, p_trip_id, v_final_price, v_next_price, v_countdown_end)
        ON CONFLICT (device_id, trip_id) DO UPDATE SET
          price_shown = EXCLUDED.price_shown,
          next_price = EXCLUDED.next_price,
          countdown_end = EXCLUDED.countdown_end,
          is_expired = false;
      END IF;
    END IF;
  END IF;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'base_price', v_base_price,
    'dynamic_price', v_final_price,
    'yield_enabled', true,
    'fill_rate_pct', ROUND(v_fill_rate, 1),
    'hours_to_departure', ROUND(v_hours_to_departure, 1),
    'factors', v_factors,
    'countdown_end', v_countdown_end,
    'next_price', v_next_price,
    'max_price', v_max_price
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_price(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_price(UUID, UUID, TEXT) TO anon;
