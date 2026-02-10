-- ============================================================
-- YENDI - 004_seed_superadmin.sql
-- Créer le compte Super Admin
-- 
-- ⚠️ IMPORTANT: Ce script crée le user via Supabase Auth.
-- Tu dois l'exécuter APRÈS les 3 scripts précédents.
-- 
-- ÉTAPES MANUELLES pour le superadmin:
-- 1. Va dans Supabase Dashboard > Authentication > Users
-- 2. Clique "Add user" > "Create new user"
-- 3. Email: clarkybrian@outlook.fr
-- 4. Password: 0106-YouDj@@
-- 5. Coche "Auto Confirm User"
-- 6. PUIS exécute le SQL ci-dessous pour mettre à jour le profil
-- ============================================================

-- Après avoir créé le user manuellement dans le dashboard Supabase,
-- exécute ceci pour s'assurer que le profil est bien configuré en superadmin:

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Récupérer l'ID du user créé
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'clarkybrian@outlook.fr';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Le user clarkybrian@outlook.fr n''existe pas encore dans auth.users.';
    RAISE NOTICE 'Va dans Supabase Dashboard > Authentication > Users > Add User';
    RAISE NOTICE 'Email: clarkybrian@outlook.fr / Password: 0106-YouDj@@';
    RAISE NOTICE 'Coche "Auto Confirm User" puis ré-exécute ce script.';
    RETURN;
  END IF;

  -- Mettre à jour ou créer le profil superadmin
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (v_user_id, 'Brian Clarky', 'clarkybrian@outlook.fr', 'superadmin', 'actif')
  ON CONFLICT (id) DO UPDATE SET
    role = 'superadmin',
    status = 'actif',
    full_name = 'Brian Clarky',
    updated_at = NOW();

  -- Mettre à jour les métadonnées auth
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', 'Brian Clarky',
    'role', 'superadmin'
  )
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Superadmin créé avec succès! ID: %', v_user_id;
END;
$$;
