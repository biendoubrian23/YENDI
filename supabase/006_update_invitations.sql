-- ============================================================
-- YENDI - 006_update_invitations.sql
-- Ajout de temp_password et phone dans la table invitations
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Ajouter la colonne temp_password pour stocker le mot de passe provisoire
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS temp_password TEXT;

-- 2. Ajouter la colonne phone pour stocker le téléphone de l'admin invité
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Ajouter la colonne phone à la table profiles si elle n'existe pas
-- (normalement elle existe déjà, mais au cas où)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- ============================================================
-- 4. Mettre à jour le trigger handle_new_user pour inclure le phone
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'superadmin' THEN 'actif'
      ELSE 'en_attente'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. NETTOYAGE : Supprimer les agences en trop (garder seulement 4)
-- Cela supprimera aussi les agency_admins, invitations, trips, 
-- financial_records liés grâce aux ON DELETE CASCADE
-- ============================================================

-- D'abord, voyons les agences existantes (à vérifier avant d'exécuter)
-- SELECT id, name, status FROM public.agencies ORDER BY created_at;

-- Garder les 4 premières agences créées, supprimer le reste
DELETE FROM public.agencies 
WHERE id NOT IN (
  SELECT id FROM public.agencies 
  ORDER BY created_at ASC 
  LIMIT 4
);

-- Vérification finale
-- SELECT id, name, status, city FROM public.agencies ORDER BY created_at;
