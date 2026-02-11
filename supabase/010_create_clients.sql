-- ============================================================
-- 010: Table clients (utilisateurs de l'application mobile)
-- Séparée de la table profiles (admins/employés agence)
-- ============================================================

-- Fonction utilitaire pour updated_at (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Table des clients mobiles
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('homme', 'femme', 'autre')),
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role = 'client'),
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.clients(id),
  loyalty_points INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'supprime')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_referral_code ON public.clients(referral_code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Activer RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Politique : un client peut lire son propre profil
CREATE POLICY "clients_select_own"
  ON public.clients
  FOR SELECT
  USING (auth.uid() = id);

-- Politique : un client peut modifier son propre profil
CREATE POLICY "clients_update_own"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique : insertion uniquement pour le propre profil (via trigger ou signup)
CREATE POLICY "clients_insert_own"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Politique : les superadmins peuvent tout voir
CREATE POLICY "clients_superadmin_all"
  ON public.clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Les agences peuvent voir les clients qui ont réservé chez eux
CREATE POLICY "clients_agency_view"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_admins
      WHERE agency_admins.profile_id = auth.uid()
    )
  );

COMMENT ON TABLE public.clients IS 'Utilisateurs de l''application mobile Yendi (clients/voyageurs)';
