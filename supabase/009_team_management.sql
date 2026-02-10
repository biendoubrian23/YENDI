-- ============================================================
-- YENDI - 009_team_management.sql
-- Ajout du rôle "visiteur" pour les membres d'équipe
-- et colonne last_login_at sur profiles
-- ============================================================

-- 1. Ajouter 'visiteur' au CHECK constraint de agency_admins.role
ALTER TABLE public.agency_admins DROP CONSTRAINT IF EXISTS agency_admins_role_check;
ALTER TABLE public.agency_admins ADD CONSTRAINT agency_admins_role_check
  CHECK (role IN ('proprietaire', 'manager', 'operateur', 'visiteur'));

-- 2. Ajouter 'visiteur' au CHECK constraint de invitations.role
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check
  CHECK (role IN ('proprietaire', 'manager', 'operateur', 'visiteur'));

-- 3. Ajouter last_login_at sur profiles pour tracer la dernière connexion
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 4. Fonction pour mettre à jour last_login_at automatiquement à chaque connexion
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = NOW(),
      status = CASE WHEN status = 'en_attente' THEN 'actif' ELSE status END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger se déclenche quand auth.users.last_sign_in_at change
-- Note: Ce trigger ne peut pas être créé sur auth.users directement
-- On utilisera plutôt la mise à jour côté API lors du login

-- ============================================================
-- NOTE IMPORTANTE : Les RLS pour la gestion d'équipe sont gérées
-- par les politiques existantes dans 002_rls_policies.sql :
--   - "own_profile_select" : chaque user voit son propre profil
--   - "admin_agency_admins_select" : chaque admin voit son lien
--   - "superadmin_*" : le superadmin voit tout
--
-- Les opérations d'équipe (liste, ajout, modif, suppression)
-- passent par le service_role via l'API /api/team/*
-- donc PAS BESOIN de politiques RLS supplémentaires.
-- Les anciennes politiques de ce fichier causaient une récursion
-- infinie sur agency_admins → 500 Internal Server Error.
-- ============================================================

DROP POLICY IF EXISTS "Agency members can view own team" ON public.agency_admins;
DROP POLICY IF EXISTS "Agency owners can manage team" ON public.agency_admins;
DROP POLICY IF EXISTS "Agency members can view team profiles" ON public.profiles;