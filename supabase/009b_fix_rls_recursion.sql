-- ============================================================
-- YENDI - 009b_fix_rls_recursion.sql
-- FIX URGENT : Supprimer les politiques RLS qui causent
-- une récursion infinie → erreur 500 sur la table profiles
-- ============================================================

-- Supprimer la politique auto-référencée sur agency_admins
DROP POLICY IF EXISTS "Agency members can view own team" ON public.agency_admins;

-- Supprimer la politique FOR ALL qui entre en conflit
DROP POLICY IF EXISTS "Agency owners can manage team" ON public.agency_admins;

-- Supprimer la politique sur profiles qui requête agency_admins (récursion)
DROP POLICY IF EXISTS "Agency members can view team profiles" ON public.profiles;

-- ============================================================
-- Vérification : les politiques existantes suffisent :
--   profiles : "own_profile_select" (id = auth.uid())
--   profiles : "superadmin_profiles_select"
--   agency_admins : "admin_agency_admins_select" (profile_id = auth.uid())
--   agency_admins : "superadmin_agency_admins_all"
-- Toutes les opérations d'équipe passent par supabaseAdmin (service_role)
-- ============================================================
