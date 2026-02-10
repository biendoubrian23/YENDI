-- ============================================================
-- YENDI - 002_rls_policies.sql
-- Row Level Security - Sécurité au niveau des lignes
-- Exécuter APRÈS 001_create_tables.sql
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: Fonction pour vérifier si l'utilisateur est superadmin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Helper: Fonction pour récupérer le rôle de l'utilisateur
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================

-- Superadmin peut tout voir
CREATE POLICY "superadmin_profiles_select" ON public.profiles
  FOR SELECT USING (public.is_superadmin());

-- Superadmin peut tout modifier
CREATE POLICY "superadmin_profiles_update" ON public.profiles
  FOR UPDATE USING (public.is_superadmin());

-- Un utilisateur peut voir son propre profil
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Un utilisateur peut modifier son propre profil
CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Insertion via service_role uniquement (pas de policy INSERT publique)
-- Le trigger handle_new_user s'en chargera

-- ============================================================
-- AGENCIES
-- ============================================================

-- Superadmin peut tout sur les agences
CREATE POLICY "superadmin_agencies_all" ON public.agencies
  FOR ALL USING (public.is_superadmin());

-- Les admins peuvent voir leur(s) agence(s)
CREATE POLICY "admin_agencies_select" ON public.agencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_admins
      WHERE agency_admins.agency_id = agencies.id
      AND agency_admins.profile_id = auth.uid()
    )
  );

-- ============================================================
-- AGENCY_ADMINS
-- ============================================================

-- Superadmin peut tout
CREATE POLICY "superadmin_agency_admins_all" ON public.agency_admins
  FOR ALL USING (public.is_superadmin());

-- Un admin peut voir les liens de ses agences
CREATE POLICY "admin_agency_admins_select" ON public.agency_admins
  FOR SELECT USING (profile_id = auth.uid());

-- ============================================================
-- INVITATIONS
-- ============================================================

-- Seul le superadmin peut gérer les invitations
CREATE POLICY "superadmin_invitations_all" ON public.invitations
  FOR ALL USING (public.is_superadmin());

-- Lecture publique par token (pour accepter l'invitation)
-- Géré via les fonctions côté serveur (service_role)

-- ============================================================
-- TRIPS
-- ============================================================

-- Superadmin peut tout voir
CREATE POLICY "superadmin_trips_all" ON public.trips
  FOR ALL USING (public.is_superadmin());

-- Un admin peut voir les trajets de son agence
CREATE POLICY "admin_trips_select" ON public.trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_admins
      WHERE agency_admins.agency_id = trips.agency_id
      AND agency_admins.profile_id = auth.uid()
    )
  );

-- Un admin peut créer des trajets pour son agence
CREATE POLICY "admin_trips_insert" ON public.trips
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_admins
      WHERE agency_admins.agency_id = trips.agency_id
      AND agency_admins.profile_id = auth.uid()
    )
  );

-- ============================================================
-- FINANCIAL_RECORDS
-- ============================================================

-- Superadmin peut tout
CREATE POLICY "superadmin_financial_all" ON public.financial_records
  FOR ALL USING (public.is_superadmin());

-- Admin peut voir les finances de son agence
CREATE POLICY "admin_financial_select" ON public.financial_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_admins
      WHERE agency_admins.agency_id = financial_records.agency_id
      AND agency_admins.profile_id = auth.uid()
    )
  );

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================

-- Superadmin peut tout voir
CREATE POLICY "superadmin_activity_all" ON public.activity_logs
  FOR ALL USING (public.is_superadmin());

-- Un utilisateur peut voir ses propres logs
CREATE POLICY "own_activity_select" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());
