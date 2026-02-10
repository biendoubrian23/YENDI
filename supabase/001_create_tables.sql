-- ============================================================
-- YENDI - 001_create_tables.sql
-- Création de toutes les tables
-- Exécuter EN PREMIER dans l'éditeur SQL de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLE: profiles
-- Extension de auth.users pour stocker les infos supplémentaires
-- Rôles: 'superadmin' ou 'admin'
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')) DEFAULT 'admin',
  status TEXT NOT NULL CHECK (status IN ('actif', 'suspendu', 'en_attente')) DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- ============================================================
-- 2. TABLE: agencies
-- Informations sur chaque agence de transport
-- ============================================================
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  siret_number TEXT,
  website TEXT,
  address TEXT,
  city TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'CI' CHECK (country_code IN ('FR', 'CI', 'SN', 'CM', 'BE', 'OTHER')),
  logo_url TEXT,
  color TEXT DEFAULT '#3b82f6', -- couleur d'identification de l'agence
  plan TEXT NOT NULL CHECK (plan IN ('standard', 'premium')) DEFAULT 'standard',
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- % de commission Yendi
  status TEXT NOT NULL CHECK (status IN ('operationnel', 'inactive', 'suspendu', 'en_attente', 'configuration')) DEFAULT 'configuration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_agencies_status ON public.agencies(status);
CREATE INDEX idx_agencies_country ON public.agencies(country_code);

-- ============================================================
-- 3. TABLE: agency_admins
-- Relation entre les admins et les agences
-- Un admin peut gérer une agence, une agence peut avoir plusieurs admins
-- ============================================================
CREATE TABLE public.agency_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('proprietaire', 'manager', 'operateur')) DEFAULT 'manager',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un admin ne peut être lié qu'une fois à une agence
  UNIQUE(agency_id, profile_id)
);

-- Index
CREATE INDEX idx_agency_admins_agency ON public.agency_admins(agency_id);
CREATE INDEX idx_agency_admins_profile ON public.agency_admins(profile_id);

-- ============================================================
-- 4. TABLE: invitations
-- Invitations envoyées aux admins d'agence
-- Workflow: superadmin crée invitation -> email envoyé -> admin clique -> crée son mdp
-- ============================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL, -- email réel de l'admin
  full_name TEXT NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('proprietaire', 'manager', 'operateur')) DEFAULT 'manager',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_status ON public.invitations(status);

-- ============================================================
-- 5. TABLE: trips (voyages/trajets)
-- Chaque trajet effectué par une agence
-- ============================================================
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0, -- montant en FCFA
  passengers_count INT NOT NULL DEFAULT 1,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('planifie', 'en_cours', 'termine', 'annule')) DEFAULT 'planifie',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_trips_agency ON public.trips(agency_id);
CREATE INDEX idx_trips_date ON public.trips(trip_date);
CREATE INDEX idx_trips_status ON public.trips(status);

-- ============================================================
-- 6. TABLE: financial_records
-- Données financières agrégées par agence par mois
-- ============================================================
CREATE TABLE public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2024),
  ca_brut BIGINT NOT NULL DEFAULT 0, -- chiffre d'affaires brut en FCFA
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  commission_amount BIGINT NOT NULL DEFAULT 0, -- commission Yendi en FCFA
  trips_count INT NOT NULL DEFAULT 0,
  reversement_status TEXT NOT NULL CHECK (reversement_status IN ('paye', 'en_attente', 'bloque')) DEFAULT 'en_attente',
  reversement_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un seul enregistrement par agence par mois/année
  UNIQUE(agency_id, month, year)
);

-- Index
CREATE INDEX idx_financial_agency ON public.financial_records(agency_id);
CREATE INDEX idx_financial_period ON public.financial_records(year, month);
CREATE INDEX idx_financial_reversement ON public.financial_records(reversement_status);

-- ============================================================
-- 7. TABLE: activity_logs
-- Journal d'activité pour tracer les actions
-- ============================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create_agency', 'invite_admin', 'login', etc.
  entity_type TEXT, -- 'agency', 'admin', 'trip', etc.
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_action ON public.activity_logs(action);
CREATE INDEX idx_activity_date ON public.activity_logs(created_at);

-- ============================================================
-- Trigger: Mise à jour automatique de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_agencies_updated
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_financial_records_updated
  BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
