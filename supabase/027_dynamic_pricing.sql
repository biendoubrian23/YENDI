                                                                                                                                                                                                                                                                              -- ============================================================
-- YENDI - 027_dynamic_pricing.sql
-- Système de Dynamic Pricing / Yield Management
-- ============================================================

-- ============================================================
-- 1. TABLE: pricing_config
-- Configuration du yield management PAR AGENCE
-- Le superadmin peut activer/désactiver chaque facteur
-- ============================================================
CREATE TABLE public.pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- Activation globale
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Facteur A : Taux de remplissage
  factor_fill_rate_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Paliers au format JSON : [{min: 0, max: 30, multiplier: 1.00}, ...]
  factor_fill_rate_tiers JSONB NOT NULL DEFAULT '[
    {"min": 0, "max": 30, "multiplier": 1.00},
    {"min": 31, "max": 50, "multiplier": 1.03},
    {"min": 51, "max": 70, "multiplier": 1.08},
    {"min": 71, "max": 85, "multiplier": 1.15},
    {"min": 86, "max": 95, "multiplier": 1.25},
    {"min": 96, "max": 100, "multiplier": 1.40}
  ]',
  
  -- Facteur B : Proximité du départ
  factor_time_proximity_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Bonus en FCFA par palier de temps
  factor_time_proximity_tiers JSONB NOT NULL DEFAULT '[
    {"hours_min": 72, "hours_max": 9999, "bonus": 0},
    {"hours_min": 24, "hours_max": 72, "bonus": 100},
    {"hours_min": 12, "hours_max": 24, "bonus": 300},
    {"hours_min": 5, "hours_max": 12, "bonus": 500},
    {"hours_min": 2, "hours_max": 5, "bonus": 800},
    {"hours_min": 0, "hours_max": 2, "bonus": 1200}
  ]',
  
  -- Facteur C : Demande historique (jour/horaire)
  factor_demand_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Bonus pour jours/horaires populaires
  factor_demand_config JSONB NOT NULL DEFAULT '{
    "peak_days": [5, 0],
    "peak_day_bonus": 300,
    "holiday_bonus": 500,
    "peak_hours": [[6,8], [17,19]],
    "peak_hour_bonus": 200,
    "off_peak_hours": [[10,14]],
    "off_peak_bonus": 0
  }',
  
  -- Facteur D : Vélocité de vente
  factor_velocity_enabled BOOLEAN NOT NULL DEFAULT true,
  factor_velocity_config JSONB NOT NULL DEFAULT '{
    "high_velocity_threshold": 5,
    "high_velocity_bonus": 300,
    "medium_velocity_threshold": 3,
    "medium_velocity_bonus": 200,
    "low_velocity_threshold": 1,
    "low_velocity_bonus": 100,
    "zero_velocity_hours": 3,
    "zero_velocity_penalty": -100
  }',
  
  -- Facteur E : Concurrence interne
  factor_competition_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Countdown / FOMO
  countdown_enabled BOOLEAN NOT NULL DEFAULT true,
  countdown_duration_minutes INTEGER NOT NULL DEFAULT 120, -- 2h par défaut
  countdown_price_increase INTEGER NOT NULL DEFAULT 300,   -- Augmentation après expiration
  
  -- Personnalisation utilisateur (FOMO ciblé)
  user_personalization_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Limites de sécurité
  max_price_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.80, -- Prix max = base * 1.80
  price_step INTEGER NOT NULL DEFAULT 100,                  -- Arrondir aux 100 FCFA
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(agency_id)
);

CREATE INDEX idx_pricing_config_agency ON public.pricing_config(agency_id);

-- ============================================================
-- 2. TABLE: user_price_locks
-- Countdown persistant par utilisateur/trajet
-- Même après déco/reco, le countdown continue
-- ============================================================
CREATE TABLE public.user_price_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,  -- Pour utilisateurs non connectés
  trip_id UUID NOT NULL REFERENCES public.scheduled_trips(id) ON DELETE CASCADE,
  
  price_shown INTEGER NOT NULL,            -- Prix affiché au moment du lock
  next_price INTEGER NOT NULL,             -- Prix après expiration du countdown
  countdown_end TIMESTAMPTZ NOT NULL,      -- Fin du countdown
  
  is_expired BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un seul lock actif par user/trip
  UNIQUE(user_id, trip_id),
  UNIQUE(device_id, trip_id)
);

CREATE INDEX idx_price_locks_user ON public.user_price_locks(user_id);
CREATE INDEX idx_price_locks_device ON public.user_price_locks(device_id);
CREATE INDEX idx_price_locks_trip ON public.user_price_locks(trip_id);
CREATE INDEX idx_price_locks_expiry ON public.user_price_locks(countdown_end) WHERE NOT is_expired;

-- ============================================================
-- 3. TABLE: user_search_log
-- Historique des recherches utilisateur (pour FOMO personnalisé)
-- ============================================================
CREATE TABLE public.user_search_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT,
  trip_id UUID REFERENCES public.scheduled_trips(id) ON DELETE CASCADE,
  route_key TEXT NOT NULL,            -- "Douala->Yaoundé" pour regrouper
  search_count INTEGER NOT NULL DEFAULT 1,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_log_user ON public.user_search_log(user_id);
CREATE INDEX idx_search_log_device ON public.user_search_log(device_id);
CREATE INDEX idx_search_log_route ON public.user_search_log(route_key);

-- ============================================================
-- 4. TABLE: price_history
-- Snapshots des prix pour analytics
-- ============================================================
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.scheduled_trips(id) ON DELETE CASCADE,
  base_price INTEGER NOT NULL,
  dynamic_price INTEGER NOT NULL,
  fill_rate_pct NUMERIC(5,2),
  hours_to_departure NUMERIC(6,1),
  factors_applied JSONB,  -- Détail de chaque facteur
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_trip ON public.price_history(trip_id);
CREATE INDEX idx_price_history_recorded ON public.price_history(recorded_at);

-- ============================================================
-- 5. FONCTION: calculate_dynamic_price
-- Algorithme central de calcul de prix
-- Appelée par l'API pour chaque trajet affiché
-- ============================================================
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
  
  -- Vérifier si le yield management est activé pour le trajet
  IF NOT v_trip.yield_enabled THEN
    RETURN jsonb_build_object(
      'base_price', v_base_price,
      'dynamic_price', v_base_price,
      'yield_enabled', false,
      'factors', '{}'::jsonb
    );
  END IF;
  
  -- Récupérer la config pricing de l'agence
  SELECT * INTO v_config
  FROM public.pricing_config
  WHERE agency_id = v_trip.agency_id;
  
  -- Si pas de config ou désactivé, retourner le prix de base
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
    -- Exception : bus quasi vide + dernières heures → pas de bonus
    IF v_fill_rate < 20 AND v_hours_to_departure < 5 THEN
      v_factor_b := 0; -- on ne pénalise pas, on laisse le prix bas pour attirer
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
    v_day_of_week := EXTRACT(DOW FROM v_trip.departure_datetime)::INTEGER; -- 0=dimanche
    v_hour_of_day := EXTRACT(HOUR FROM v_trip.departure_datetime)::INTEGER;
    
    -- Jours de pointe
    IF v_day_of_week = ANY(
      (SELECT ARRAY(SELECT jsonb_array_elements_text(v_config.factor_demand_config->'peak_days'))::INTEGER[])
    ) THEN
      v_factor_c := v_factor_c + COALESCE((v_config.factor_demand_config->>'peak_day_bonus')::INTEGER, 0);
    END IF;
    
    -- Heures de pointe
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
    -- Compter les réservations des 3 dernières heures
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
  
  -- Ne pas dépasser le prix max
  IF v_final_price > v_max_price THEN
    v_final_price := v_max_price;
  END IF;
  
  -- Arrondir au palier
  v_final_price := FLOOR(v_final_price / v_price_step) * v_price_step;
  
  -- ═══ COUNTDOWN / PRICE LOCK ═══
  v_countdown_end := NULL;
  v_next_price := v_final_price;
  
  IF v_countdown_enabled AND (p_user_id IS NOT NULL OR p_device_id IS NOT NULL) THEN
    -- Chercher un lock existant
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
      IF v_lock.countdown_end > NOW() THEN
        -- Lock encore valide → retourner le prix locké
        v_final_price := v_lock.price_shown;
        v_countdown_end := v_lock.countdown_end;
        v_next_price := v_lock.next_price;
      ELSE
        -- Lock expiré → marquer comme expiré, utiliser le nouveau prix
        UPDATE public.user_price_locks
        SET is_expired = true
        WHERE id = v_lock.id;
        
        -- Créer un nouveau lock avec le prix actuel
        v_next_price := LEAST(
          v_final_price + v_countdown_increase,
          v_max_price
        );
        v_next_price := FLOOR(v_next_price / v_price_step) * v_price_step;
        v_countdown_end := NOW() + (v_countdown_minutes || ' minutes')::INTERVAL;
        
        INSERT INTO public.user_price_locks (user_id, device_id, trip_id, price_shown, next_price, countdown_end)
        VALUES (p_user_id, p_device_id, p_trip_id, v_final_price, v_next_price, v_countdown_end)
        ON CONFLICT (user_id, trip_id) DO UPDATE SET
          price_shown = EXCLUDED.price_shown,
          next_price = EXCLUDED.next_price,
          countdown_end = EXCLUDED.countdown_end,
          is_expired = false;
      END IF;
    ELSE
      -- Pas de lock → créer un nouveau
      v_next_price := LEAST(
        v_final_price + v_countdown_increase,
        v_max_price
      );
      v_next_price := FLOOR(v_next_price / v_price_step) * v_price_step;
      v_countdown_end := NOW() + (v_countdown_minutes || ' minutes')::INTERVAL;
      
      INSERT INTO public.user_price_locks (user_id, device_id, trip_id, price_shown, next_price, countdown_end)
      VALUES (p_user_id, p_device_id, p_trip_id, v_final_price, v_next_price, v_countdown_end)
      ON CONFLICT (user_id, trip_id) DO UPDATE SET
        price_shown = EXCLUDED.price_shown,
        next_price = EXCLUDED.next_price,
        countdown_end = EXCLUDED.countdown_end,
        is_expired = false;
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

-- ============================================================
-- 6. RLS Policies
-- ============================================================
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_price_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Superadmin : accès total à pricing_config
CREATE POLICY "Superadmin full access pricing_config"
  ON public.pricing_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Admin agence : lecture seule de sa config
CREATE POLICY "Agency admin read own pricing_config"
  ON public.pricing_config FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid())
  );

-- user_price_locks : l'utilisateur lit ses propres locks
CREATE POLICY "Users read own price locks"
  ON public.user_price_locks FOR SELECT
  USING (user_id = auth.uid());

-- Service role peut faire INSERT/UPDATE sur les locks (via API)
CREATE POLICY "Service insert price locks"
  ON public.user_price_locks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service update price locks"
  ON public.user_price_locks FOR UPDATE
  USING (true);

-- search_log : insert pour tous, lecture pour superadmin
CREATE POLICY "Anyone can insert search log"
  ON public.user_search_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Superadmin read search log"
  ON public.user_search_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- price_history : lecture pour superadmin et admin agence
CREATE POLICY "Superadmin read price history"
  ON public.price_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Service insert price history"
  ON public.price_history FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 7. Trigger updated_at
-- ============================================================
CREATE TRIGGER on_pricing_config_updated
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 8. Auto-créer une pricing_config pour chaque agence existante
-- ============================================================
INSERT INTO public.pricing_config (agency_id)
SELECT id FROM public.agencies
ON CONFLICT (agency_id) DO NOTHING;

-- ============================================================
-- 9. Trigger: auto-créer pricing_config quand une agence est créée
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_pricing_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.pricing_config (agency_id)
  VALUES (NEW.id)
  ON CONFLICT (agency_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agency_created_pricing
  AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_pricing_config();
