-- ============================================================
-- YENDI - 007_create_buses.sql
-- Table des bus / véhicules liés aux agences
-- ============================================================

-- ============================================================
-- TABLE: buses
-- Chaque bus appartient à une agence
-- seat_layout décrit la disposition des sièges en JSON :
--   { "left": 2, "right": 2, "back_row": 5, "rows": 12 }
--   left = nb sièges côté gauche par rangée
--   right = nb sièges côté droit par rangée
--   back_row = nb sièges sur la dernière rangée (optionnel)
--   rows = nombre de rangées (sans la dernière rangée arrière)
-- ============================================================
CREATE TABLE public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,                 -- Mercedes, Volvo, MAN, Irizar...
  model TEXT NOT NULL,                 -- Tourismo, 9700, C13...
  number TEXT NOT NULL,                -- Numéro interne : 402, 405...
  plate TEXT NOT NULL,                 -- Immatriculation : AB-123-CD
  seats INTEGER NOT NULL DEFAULT 50,
  seat_layout JSONB NOT NULL DEFAULT '{"left": 2, "right": 2, "back_row": 5, "rows": 12}',
  status TEXT NOT NULL DEFAULT 'disponible'
    CHECK (status IN ('disponible', 'en_route', 'maintenance', 'hors_service')),
  fuel_level INTEGER NOT NULL DEFAULT 100
    CHECK (fuel_level >= 0 AND fuel_level <= 100),
  mileage INTEGER NOT NULL DEFAULT 0,  -- en km
  features TEXT[] DEFAULT '{}',        -- {'WiFi', 'WC', 'Clim', 'Prises USB', 'TV'}
  current_driver TEXT,
  current_line TEXT,
  last_revision DATE,
  next_revision DATE,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX performants pour requêtes fréquentes
-- Composite index agency_id + status pour filtrage dashboard
-- ============================================================
CREATE INDEX idx_buses_agency_id ON public.buses(agency_id);
CREATE INDEX idx_buses_status ON public.buses(status);
CREATE INDEX idx_buses_agency_status ON public.buses(agency_id, status);
CREATE INDEX idx_buses_plate ON public.buses(plate);
CREATE INDEX idx_buses_number ON public.buses(number);

-- Index B-tree pour recherche sur marque et modèle
CREATE INDEX idx_buses_brand ON public.buses(brand);
CREATE INDEX idx_buses_model ON public.buses(model);

-- ============================================================
-- Trigger: updated_at automatique
-- ============================================================
CREATE TRIGGER on_buses_updated
  BEFORE UPDATE ON public.buses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- RLS (Row Level Security) pour la table buses
-- ============================================================
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

-- Politique: les admins d'une agence peuvent voir uniquement leurs bus
CREATE POLICY "Agency admins can view own buses"
  ON public.buses FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Politique: les admins d'une agence peuvent créer des bus pour leur agence
CREATE POLICY "Agency admins can insert own buses"
  ON public.buses FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Politique: les admins d'une agence peuvent modifier leurs bus
CREATE POLICY "Agency admins can update own buses"
  ON public.buses FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Politique: les admins d'une agence peuvent supprimer leurs bus
CREATE POLICY "Agency admins can delete own buses"
  ON public.buses FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Politique: les superadmins peuvent tout voir
CREATE POLICY "Superadmins can view all buses"
  ON public.buses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
