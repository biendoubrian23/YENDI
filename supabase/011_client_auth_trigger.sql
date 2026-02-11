-- ============================================================
-- 011: Trigger pour auto-créer le profil client lors de l'inscription
-- depuis l'application mobile
-- ============================================================

-- Fonction pour générer un code de parrainage unique
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Générer un code de 8 caractères alphanumériques
    code := upper(substr(md5(random()::text), 1, 8));
    -- Vérifier unicité
    SELECT EXISTS(SELECT 1 FROM public.clients WHERE referral_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Trigger qui crée automatiquement un profil client après inscription
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que c'est un client (pas un admin/employé)
  -- Les admins ont déjà un profil dans la table profiles via invitation
  -- Les clients s'inscrivent directement via l'app mobile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.clients (id, full_name, email, phone, referral_code)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Client'),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      public.generate_referral_code()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe pour éviter les conflits
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created_client
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_client();

COMMENT ON FUNCTION public.handle_new_client() IS 'Crée automatiquement un profil client lors de l''inscription depuis l''app mobile';
COMMENT ON FUNCTION public.generate_referral_code() IS 'Génère un code de parrainage unique de 8 caractères';
