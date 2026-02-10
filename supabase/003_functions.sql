-- ============================================================
-- YENDI - 003_functions.sql
-- Fonctions et triggers pour la logique métier
-- Exécuter APRÈS 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- 1. TRIGGER: Créer automatiquement un profil quand un user s'inscrit
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'superadmin' THEN 'actif'
      ELSE 'en_attente'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencher à chaque nouvel utilisateur auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. FONCTION: Créer une agence avec son admin principal
-- Appelée par le superadmin depuis le frontend
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_agency_with_admin(
  p_agency_name TEXT,
  p_siret TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT 'Abidjan',
  p_country_code TEXT DEFAULT 'CI',
  p_color TEXT DEFAULT '#3b82f6',
  p_plan TEXT DEFAULT 'standard',
  p_admin_full_name TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_admin_role TEXT DEFAULT 'proprietaire'
)
RETURNS JSON AS $$
DECLARE
  v_agency_id UUID;
  v_invitation_id UUID;
  v_token TEXT;
BEGIN
  -- Vérifier que l'appelant est superadmin
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Seul le superadmin peut créer une agence';
  END IF;

  -- Créer l'agence
  INSERT INTO public.agencies (name, siret_number, website, address, city, country_code, color, plan, status)
  VALUES (p_agency_name, p_siret, p_website, p_address, p_city, p_country_code, p_color, p_plan, 
    CASE WHEN p_admin_email IS NOT NULL THEN 'en_attente' ELSE 'configuration' END
  )
  RETURNING id INTO v_agency_id;

  -- Si un admin est spécifié, créer une invitation
  IF p_admin_email IS NOT NULL AND p_admin_full_name IS NOT NULL THEN
    INSERT INTO public.invitations (email, full_name, agency_id, role)
    VALUES (p_admin_email, p_admin_full_name, v_agency_id, p_admin_role)
    RETURNING id, token INTO v_invitation_id, v_token;

    -- Logger l'action
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(), 
      'create_agency_with_invite', 
      'agency', 
      v_agency_id,
      jsonb_build_object(
        'agency_name', p_agency_name,
        'admin_email', p_admin_email,
        'invitation_id', v_invitation_id
      )
    );

    RETURN json_build_object(
      'success', true,
      'agency_id', v_agency_id,
      'invitation_id', v_invitation_id,
      'invitation_token', v_token
    );
  ELSE
    -- Logger l'action
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(), 
      'create_agency', 
      'agency', 
      v_agency_id,
      jsonb_build_object('agency_name', p_agency_name)
    );

    RETURN json_build_object(
      'success', true,
      'agency_id', v_agency_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FONCTION: Accepter une invitation (côté admin)
-- L'admin clique sur le lien, crée son mot de passe
-- Le compte auth est créé, puis lié à l'agence
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expirée';
  END IF;

  -- Mettre à jour le profil
  UPDATE public.profiles
  SET status = 'actif', full_name = v_invitation.full_name
  WHERE id = p_user_id;

  -- Lier l'admin à l'agence
  INSERT INTO public.agency_admins (agency_id, profile_id, role, is_primary)
  VALUES (v_invitation.agency_id, p_user_id, v_invitation.role, TRUE)
  ON CONFLICT (agency_id, profile_id) DO NOTHING;

  -- Mettre à jour le statut de l'agence
  UPDATE public.agencies
  SET status = 'operationnel'
  WHERE id = v_invitation.agency_id AND status IN ('configuration', 'en_attente');

  -- Marquer l'invitation comme acceptée
  UPDATE public.invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  -- Logger
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    p_user_id,
    'accept_invitation',
    'invitation',
    v_invitation.id,
    jsonb_build_object('agency_id', v_invitation.agency_id, 'email', v_invitation.email)
  );

  RETURN json_build_object(
    'success', true,
    'agency_id', v_invitation.agency_id,
    'role', v_invitation.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FONCTION: Statistiques du dashboard superadmin
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  v_active_agencies INT;
  v_total_agencies INT;
  v_active_admins INT;
  v_connected_24h INT;
  v_volume_month BIGINT;
  v_pending_agencies INT;
  v_total_trips_month INT;
BEGIN
  -- Agences
  SELECT COUNT(*) INTO v_total_agencies FROM public.agencies;
  SELECT COUNT(*) INTO v_active_agencies FROM public.agencies WHERE status = 'operationnel';
  SELECT COUNT(*) INTO v_pending_agencies FROM public.agencies WHERE status IN ('en_attente', 'suspendu', 'configuration');

  -- Admins
  SELECT COUNT(*) INTO v_active_admins FROM public.profiles WHERE role = 'admin' AND status = 'actif';
  
  -- Connexions dernières 24h (approximation via last_sign_in_at)
  SELECT COUNT(*) INTO v_connected_24h
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.role = 'admin' AND u.last_sign_in_at > NOW() - INTERVAL '24 hours';

  -- Volume du mois en cours
  SELECT COALESCE(SUM(amount), 0) INTO v_volume_month
  FROM public.trips
  WHERE EXTRACT(MONTH FROM trip_date) = EXTRACT(MONTH FROM NOW())
  AND EXTRACT(YEAR FROM trip_date) = EXTRACT(YEAR FROM NOW())
  AND status = 'termine';

  -- Trajets du mois
  SELECT COUNT(*) INTO v_total_trips_month
  FROM public.trips
  WHERE EXTRACT(MONTH FROM trip_date) = EXTRACT(MONTH FROM NOW())
  AND EXTRACT(YEAR FROM trip_date) = EXTRACT(YEAR FROM NOW());

  RETURN json_build_object(
    'total_agencies', v_total_agencies,
    'active_agencies', v_active_agencies,
    'pending_agencies', v_pending_agencies,
    'active_admins', v_active_admins,
    'connected_24h', v_connected_24h,
    'volume_month', v_volume_month,
    'total_trips_month', v_total_trips_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FONCTION: Stats financières globales
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  p_month INT DEFAULT EXTRACT(MONTH FROM NOW())::INT
)
RETURNS JSON AS $$
DECLARE
  v_ca_global BIGINT;
  v_commission_total BIGINT;
  v_trips_total INT;
  v_reversements_attente BIGINT;
BEGIN
  SELECT 
    COALESCE(SUM(ca_brut), 0),
    COALESCE(SUM(commission_amount), 0),
    COALESCE(SUM(trips_count), 0)
  INTO v_ca_global, v_commission_total, v_trips_total
  FROM public.financial_records
  WHERE year = p_year AND month = p_month;

  SELECT COALESCE(SUM(commission_amount), 0)
  INTO v_reversements_attente
  FROM public.financial_records
  WHERE reversement_status = 'en_attente';

  RETURN json_build_object(
    'ca_global', v_ca_global,
    'commission_total', v_commission_total,
    'trips_total', v_trips_total,
    'reversements_attente', v_reversements_attente
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FONCTION: Evolution du CA sur plusieurs mois
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ca_evolution(
  p_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  p_months INT DEFAULT 6
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT 
        month,
        year,
        SUM(ca_brut) as ca_total,
        SUM(commission_amount) as commission_total,
        SUM(trips_count) as trips_total
      FROM public.financial_records
      WHERE year = p_year
      GROUP BY year, month
      ORDER BY year, month
      LIMIT p_months
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. FONCTION: Générer un email basé sur nom/prénom
-- Format: prenom.nom@yendi-agence.pro
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_admin_email(
  p_full_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_parts TEXT[];
  v_prenom TEXT;
  v_nom TEXT;
  v_email TEXT;
  v_counter INT := 0;
BEGIN
  -- Séparer le nom en parties
  v_parts := string_to_array(LOWER(TRIM(p_full_name)), ' ');
  
  IF array_length(v_parts, 1) >= 2 THEN
    v_prenom := v_parts[1];
    v_nom := v_parts[array_length(v_parts, 1)];
  ELSE
    v_prenom := v_parts[1];
    v_nom := v_parts[1];
  END IF;

  -- Nettoyer les accents et caractères spéciaux
  v_prenom := translate(v_prenom, 'àâäéèêëïîôùûüç', 'aaaeeeeiioouuc');
  v_nom := translate(v_nom, 'àâäéèêëïîôùûüç', 'aaaeeeeiioouuc');
  
  v_email := v_prenom || '.' || v_nom || '@yendi-agence.pro';
  
  -- Vérifier unicité et ajouter un compteur si nécessaire
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE email = v_email) LOOP
    v_counter := v_counter + 1;
    v_email := v_prenom || '.' || v_nom || v_counter::TEXT || '@yendi-agence.pro';
  END LOOP;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
